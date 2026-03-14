const config = window.APP_CONFIG;
const form = document.getElementById('bookingForm');
const formMessage = document.getElementById('formMessage');
const availabilitySummary = document.getElementById('availabilitySummary');
const breedSelect = document.getElementById('breedSelect');
const serviceSelect = document.getElementById('serviceSelect');
const dateInput = document.getElementById('dateInput');
const slotSelect = document.getElementById('slotSelect');

const supabaseClient = window.supabase.createClient(
  config.supabaseUrl,
  config.supabaseAnonKey
);

let services = [];
let rules = [];
let bookedSlots = [];

function toLocalDateString(date) {
  return date.toISOString().split('T')[0];
}

function combineUtc(dateString, timeString) {
  return new Date(`${dateString}T${timeString}:00`);
}

function formatTime(date) {
  return date.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function minutesToMs(minutes) {
  return minutes * 60 * 1000;
}

function setMessage(text, isError = false) {
  formMessage.textContent = text;
  formMessage.style.color = isError ? '#b0402f' : '#6f5e56';
}

async function loadSelectOptions() {
  const [{ data: breeds, error: breedsError }, { data: servicesData, error: servicesError }, { data: rulesData, error: rulesError }] = await Promise.all([
    supabaseClient.from('dog_breeds').select('id,name,size_category').order('name'),
    supabaseClient.from('grooming_services').select('id,name,duration_minutes').eq('is_active', true).order('price_from'),
    supabaseClient.from('availability_rules').select('*').eq('is_active', true).order('weekday').order('start_time')
  ]);

  if (breedsError || servicesError || rulesError) {
    setMessage('Не вдалося завантажити дані для запису. Перевір Supabase політики.', true);
    return;
  }

  services = servicesData || [];
  rules = rulesData || [];

  breedSelect.innerHTML = '<option value="">Оберіть породу</option>' +
    (breeds || []).map((breed) => `<option value="${breed.id}">${breed.name}</option>`).join('');

  serviceSelect.innerHTML = '<option value="">Оберіть послугу</option>' +
    services.map((service) => `<option value="${service.id}" data-duration="${service.duration_minutes}">${service.name} — ${service.duration_minutes} хв</option>`).join('');
}

async function loadBookedSlots(dateString) {
  const start = `${dateString}T00:00:00`;
  const end = `${dateString}T23:59:59`;

  const { data, error } = await supabaseClient
    .from('appointments')
    .select('starts_at, ends_at, status')
    .in('status', ['pending', 'confirmed'])
    .gte('starts_at', start)
    .lte('starts_at', end)
    .order('starts_at');

  if (error) {
    setMessage('Не вдалося завантажити зайняті слоти.', true);
    return [];
  }

  return data || [];
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function buildSlots(dateString) {
  const selectedService = services.find((service) => service.id === serviceSelect.value);
  const duration = selectedService ? selectedService.duration_minutes : 90;
  const weekday = new Date(`${dateString}T00:00:00`).getDay();
  const dayRules = rules.filter((rule) => rule.weekday === weekday);

  const slots = [];

  for (const rule of dayRules) {
    let cursor = combineUtc(dateString, rule.start_time.slice(0, 5));
    const ruleEnd = combineUtc(dateString, rule.end_time.slice(0, 5));

    while (cursor.getTime() + minutesToMs(duration) <= ruleEnd.getTime()) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + minutesToMs(duration));
      const isBusy = bookedSlots.some((item) =>
        overlaps(slotStart, slotEnd, new Date(item.starts_at), new Date(item.ends_at))
      );

      if (!isBusy) {
        slots.push({
          value: slotStart.toISOString(),
          label: `${formatTime(slotStart)} — ${formatTime(slotEnd)}`
        });
      }

      cursor = new Date(cursor.getTime() + minutesToMs(rule.slot_step_minutes));
    }
  }

  return slots;
}

async function refreshSlots() {
  const dateString = dateInput.value;
  slotSelect.innerHTML = '<option value="">Оберіть вільний час</option>';

  if (!dateString) {
    availabilitySummary.textContent = 'Оберіть дату, щоб побачити вільний час.';
    return;
  }

  bookedSlots = await loadBookedSlots(dateString);
  const slots = buildSlots(dateString);

  slotSelect.innerHTML = '<option value="">Оберіть вільний час</option>' +
    slots.map((slot) => `<option value="${slot.value}">${slot.label}</option>`).join('');

  availabilitySummary.textContent = slots.length
    ? `На ${dateString} зараз доступно ${slots.length} слот(ів).`
    : `На ${dateString} вільних слотів поки нема.`;
}

async function submitAppointment(event) {
  event.preventDefault();
  setMessage('Зберігаю запис...');

  const data = new FormData(form);
  const selectedService = services.find((service) => service.id === data.get('service_id'));
  const startsAt = new Date(data.get('slot'));
  const endsAt = new Date(startsAt.getTime() + minutesToMs(selectedService ? selectedService.duration_minutes : 90));

  const payload = {
    owner_name: data.get('owner_name'),
    phone: data.get('phone'),
    dog_name: data.get('dog_name'),
    dog_breed_id: data.get('dog_breed_id'),
    service_id: data.get('service_id'),
    last_grooming_bucket: data.get('last_grooming_bucket'),
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    notes: data.get('notes') || null,
    status: 'pending'
  };

  const { error } = await supabaseClient.from('appointments').insert(payload);

  if (error) {
    setMessage(`Не вдалося створити запис: ${error.message}`, true);
    return;
  }

  setMessage('Запис створено. Слот тепер має зникнути зі списку доступних.');
  form.reset();
  dateInput.value = toLocalDateString(new Date());
  await refreshSlots();
}

async function bootstrap() {
  const today = new Date();
  const max = new Date();
  max.setMonth(max.getMonth() + 2);
  dateInput.min = toLocalDateString(today);
  dateInput.max = toLocalDateString(max);
  dateInput.value = toLocalDateString(today);

  await loadSelectOptions();
  await refreshSlots();
}

serviceSelect?.addEventListener('change', refreshSlots);
dateInput?.addEventListener('change', refreshSlots);
form?.addEventListener('submit', submitAppointment);
bootstrap();
