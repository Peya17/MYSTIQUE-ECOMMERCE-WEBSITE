(function () {

    // Tells the CSS that JavaScript is running,
    // so the fade-in effect only applies when it can actually work.
    document.documentElement.classList.add('js');

    var items = document.querySelectorAll('.reveal');

    // Older browsers: just show everything.
    if (!('IntersectionObserver' in window)) {
        items.forEach(function (item) {
            item.classList.add('visible');
        });
        return;
    }

    // Fade each section in the first time it scrolls into view.
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    items.forEach(function (item) {
        observer.observe(item);
    });

})();