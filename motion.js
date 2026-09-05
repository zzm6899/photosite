// Motion is progressive enhancement: the original photographs always remain underneath.
window.SiteMotion = {
  mount(root) {
    const controller = new AbortController();
    const { signal } = controller;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
    let observer;
    let frame = 0;
    let disposeScene = () => {};
    let sceneGeneration = 0;
    const header = document.querySelector("[data-header]");
    const targets = [...root.querySelectorAll(".section.narrow, .service-intro > *, .review, .quote-shell, .contact-layout > *, .portfolio-intro > *, .portfolio-cover > figure, .home-selections > figure, .image-tile")];
    const covers = [...root.querySelectorAll(".portfolio-cover > figure:not(:first-child)")];
    const disabled = () => reduced.matches || document.body.classList.contains("editing");

    const paint = () => {
      frame = 0;
      header.classList.toggle("is-scrolled", window.scrollY > 24);
      const distance = document.documentElement.scrollHeight - innerHeight;
      header.style.setProperty("--page-progress", distance > 0 ? Math.min(1, window.scrollY / distance) : 0);
      covers.forEach((cover, index) => {
        const box = cover.parentElement.getBoundingClientRect();
        const amount = Math.max(-1, Math.min(1, (innerHeight / 2 - box.top - box.height / 2) / innerHeight));
        cover.style.translate = disabled() || !finePointer.matches ? "none" : `0 ${amount * (index ? -32 : 32)}px`;
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };

    const setup = () => {
      observer?.disconnect();
      disposeScene();
      const generation = ++sceneGeneration;
      targets.forEach(node => node.classList.remove("reveal-pending", "is-revealed"));
      if (!disabled() && "IntersectionObserver" in window) {
        observer = new IntersectionObserver(entries => {
          entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
            entry.target.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 65}ms`);
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          });
        }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });
        targets.forEach(node => { node.classList.add("reveal-pending"); observer.observe(node); });
      }
      const hero = root.querySelector("[data-carousel]");
      if (hero && !disabled()) {
        import("./photo-scene.js").then(({ mountPhotoScene }) => {
          if (!signal.aborted && generation === sceneGeneration) disposeScene = mountPhotoScene(hero, finePointer);
        }).catch(() => { /* Keep the normal slideshow if WebGL or the module is unavailable. */ });
      }
      schedule();
    };

    window.addEventListener("scroll", schedule, { passive: true, signal });
    window.addEventListener("resize", schedule, { passive: true, signal });
    reduced.addEventListener("change", setup, { signal });
    finePointer.addEventListener("change", schedule, { signal });
    document.addEventListener("editingchange", setup, { signal });
    setup();
    return () => {
      controller.abort();
      observer?.disconnect();
      cancelAnimationFrame(frame);
      disposeScene();
    };
  }
};
