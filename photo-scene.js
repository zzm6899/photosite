import * as THREE from "./assets/vendor/three.module.min.js";

export function mountPhotoScene(hero, finePointer) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
  } catch {
    return () => {};
  }
  const controller = new AbortController();
  const { signal } = controller;
  const scene = new THREE.Scene();
  const loader = new THREE.TextureLoader();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10);
  camera.position.z = 3;
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
  const photo = new THREE.Mesh(geometry, material);
  scene.add(photo);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = "photo-scene";
  canvas.setAttribute("aria-hidden", "true");
  let texture;
  let currentImage;
  let request = 0;
  let frame = 0;
  let visible = true;
  let targetX = 0;
  let targetY = 0;
  let scrollOffset = 0;
  let previousTime = 0;

  const fit = () => {
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (!texture || !currentImage?.naturalWidth) return;
    const imageAspect = currentImage.naturalWidth / currentImage.naturalHeight;
    const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(35 / 2)) * camera.position.z;
    const scale = Math.max(viewHeight / currentImage.naturalHeight, viewHeight * camera.aspect / currentImage.naturalWidth) * 1.08;
    photo.scale.set(currentImage.naturalHeight * imageAspect * scale, currentImage.naturalHeight * scale, 1);
    const position = currentImage.style.getPropertyValue("--pos").trim();
    photo.position.x = position === "left" ? (photo.scale.x - viewHeight * camera.aspect) / 2 : position === "right" ? -(photo.scale.x - viewHeight * camera.aspect) / 2 : 0;
    photo.position.y = position === "top" ? -(photo.scale.y - viewHeight) / 2 : position === "bottom" ? (photo.scale.y - viewHeight) / 2 : 0;
  };
  const draw = (time) => {
    frame = 0;
    if (signal.aborted || !visible || document.hidden) return;
    const dt = Math.min((time - previousTime) / 1000 || 0.016, 0.05);
    previousTime = time;
    const ease = 1 - Math.exp(-dt * 6);
    photo.rotation.y += (targetX * 0.025 - photo.rotation.y) * ease;
    photo.rotation.x += ((targetY * 0.018 + scrollOffset) - photo.rotation.x) * ease;
    material.opacity += (1 - material.opacity) * ease;
    renderer.render(scene, camera);
    if (material.opacity < 0.999 || Math.abs(photo.rotation.y - targetX * 0.025) > 0.0001 || Math.abs(photo.rotation.x - targetY * 0.018 - scrollOffset) > 0.0001) wake();
  };
  const wake = () => { if (!frame && !signal.aborted && visible && !document.hidden) frame = requestAnimationFrame(draw); };
  const select = async () => {
    const id = ++request;
    canvas.remove();
    currentImage = hero.querySelector(".is-active > img");
    const image = currentImage;
    // Remote editor images retain the DOM fallback; only local images enter WebGL.
    if (new URL(image.src).origin !== location.origin && !image.src.startsWith("data:")) return;
    let nextTexture;
    try {
      await image.decode();
      nextTexture = await loader.loadAsync(image.currentSrc || image.src);
    } catch { return; }
    if (signal.aborted || id !== request) { nextTexture.dispose(); return; }
    texture?.dispose();
    texture = nextTexture;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    material.map = texture;
    material.opacity = 0;
    material.needsUpdate = true;
    image.parentElement.appendChild(canvas);
    fit();
    wake();
  };
  const resize = new ResizeObserver(() => { fit(); wake(); });
  resize.observe(hero);
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; wake(); });
  intersection.observe(hero);
  hero.addEventListener("pointermove", event => {
    if (!finePointer.matches || event.pointerType !== "mouse") return;
    const rect = hero.getBoundingClientRect();
    targetX = (event.clientX - rect.left) / rect.width * 2 - 1;
    targetY = (event.clientY - rect.top) / rect.height * 2 - 1;
    wake();
  }, { passive: true, signal });
  hero.addEventListener("pointerleave", () => { targetX = targetY = 0; wake(); }, { signal });
  window.addEventListener("scroll", () => {
    scrollOffset = Math.max(-0.025, Math.min(0.025, -hero.getBoundingClientRect().top / innerHeight * 0.03));
    wake();
  }, { passive: true, signal });
  document.addEventListener("visibilitychange", wake, { signal });
  hero.addEventListener("slidechange", select, { signal });
  canvas.addEventListener("webglcontextlost", () => { canvas.remove(); controller.abort(); cancelAnimationFrame(frame); }, { signal });
  select();
  return () => {
    controller.abort();
    cancelAnimationFrame(frame);
    resize.disconnect();
    intersection.disconnect();
    texture?.dispose();
    material.dispose();
    geometry.dispose();
    renderer.dispose();
    canvas.remove();
  };
}
