const form = document.getElementById('bookingForm');
const formMessage = document.getElementById('formMessage');

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const owner = data.get('owner');
    const pet = data.get('pet');

    formMessage.textContent = `Дякуємо, ${owner}! Заявку для ${pet} отримано. Ми зв’яжемося з вами найближчим часом.`;
    form.reset();
  });
}
