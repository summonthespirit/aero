  const bgv = document.getElementById('background-video');
  setTimeout(() => {
    const el = document.getElementById('loading-screen');
    el.classList.add('hide');
    setTimeout(() => el.remove(), 500);

    bgv.muted = false;
    bgv.play().catch(() => {
      window.addEventListener('click', () => bgv.play(), { once: true });
    });
  }, 3000);