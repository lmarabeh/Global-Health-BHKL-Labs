// Functional code for card carousel
document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.querySelector(".cards-wrapper");
  const cards = document.querySelectorAll(".card");
  const btnNext = document.querySelector(".carousel-btn.next");
  const btnPrev = document.querySelector(".carousel-btn.prev");

  let currentIndex = 0;

  const cardWidth = cards[0].offsetWidth + 20; // width + margin
  const maxIndex = cards.length - 1;

  btnNext.addEventListener("click", () => {
    if (currentIndex < maxIndex) {
      currentIndex += 1;
      wrapper.style.transform = `translateX(-${cardWidth * currentIndex}px)`;
    }
  });

  btnPrev.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex -= 1;
      wrapper.style.transform = `translateX(-${cardWidth * currentIndex}px)`;
    }
  });
});

