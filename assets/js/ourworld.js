//enable animations
//adds a "js-enabled" class right away, so the css only hides the [data-animate]
//elements when javascript is available to reveal them again
document.documentElement.classList.add("js-enabled");


//navbar
//handles the mobile menu: the hamburger button opens and closes the link list,
//tapping a link or pressing escape closes it, and aria-expanded keeps screen readers in sync
function initNavbar() {
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");

  if (!toggle || !links) return;

  //opens or closes the menu and updates the button state to match
  function setMenu(isOpen) {
    links.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  }

  toggle.addEventListener("click", function () {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    setMenu(!isOpen);
  });

  //closes the menu after a link is chosen
  links.addEventListener("click", function (event) {
    if (event.target.closest("a")) setMenu(false);
  });

  //closes the menu with the escape key
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setMenu(false);
  });
}


//scroll animation
//slides each [data-animate] element in (from the left, right or bottom) the first time
//it scrolls into view. the css does the movement, this function only adds the
//"is-visible" class at the right moment
function initScrollReveal() {
  const items = document.querySelectorAll("[data-animate]");

  if (!items.length) return;

  //shows everything immediately when the browser has no IntersectionObserver
  //or when the visitor prefers reduced motion
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!("IntersectionObserver" in window) || reduceMotion) {
    items.forEach(function (item) {
      item.classList.add("is-visible");
    });
    return;
  }

  //copies the optional data-delay value (in milliseconds) into a css variable
  //so neighbouring cards can slide in one after the other
  items.forEach(function (item) {
    const delay = item.dataset.delay;
    if (delay) item.style.setProperty("--delay", delay + "ms");
  });

  //watches the elements and reveals each one once it is about 15% visible,
  //then stops watching it so the animation only plays one time
  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -6% 0px"
    }
  );

  items.forEach(function (item) {
    observer.observe(item);
  });
}


//init
//starts every feature once the page has finished loading
document.addEventListener("DOMContentLoaded", function () {
  initNavbar();
  initScrollReveal();
});