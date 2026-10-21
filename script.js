// Tags hang still by default; they swing once when the window scrolls into view.
const shelf = document.querySelector(".shelf");
if (shelf && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    shelf.classList.add("is-swinging");
    io.disconnect();
  }, { threshold: 0.4 });
  io.observe(shelf);
}
