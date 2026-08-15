// ---- Free Headkicks storefront interactivity ----

document.addEventListener('DOMContentLoaded', () => {

  // --- Product gallery ---
  const mainImg = document.getElementById('galleryMain');
  const thumbs = document.querySelectorAll('#galleryThumbs button');
  const galleryImages = Array.from(thumbs).map(btn => btn.getAttribute('data-img'));
  let currentIndex = 0;

  function showImage(index) {
    currentIndex = (index + galleryImages.length) % galleryImages.length;
    const src = galleryImages[currentIndex];
    mainImg.style.opacity = 0;
    setTimeout(() => {
      mainImg.src = src;
      mainImg.style.opacity = 1;
    }, 120);
    thumbs.forEach(b => b.classList.remove('active'));
    thumbs[currentIndex].classList.add('active');
  }

  thumbs.forEach((btn, i) => {
    btn.addEventListener('click', () => showImage(i));
  });

  const prevBtn = document.getElementById('galleryPrev');
  const nextBtn = document.getElementById('galleryNext');
  if (prevBtn) prevBtn.addEventListener('click', () => showImage(currentIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => showImage(currentIndex + 1));

  // --- Size selector ---
  let selectedSize = 'M';
  const sizeButtons = document.querySelectorAll('.size-opt');
  sizeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = btn.getAttribute('data-size');
    });
  });

  // --- Quantity stepper ---
  let qty = 1;
  const qtyVal = document.getElementById('qtyVal');
  document.getElementById('qtyMinus').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    qtyVal.textContent = qty;
  });
  document.getElementById('qtyPlus').addEventListener('click', () => {
    qty = Math.min(10, qty + 1);
    qtyVal.textContent = qty;
  });

  // --- Checkout button ---
  // Calls the create-checkout-session Netlify Function, which talks to
  // Stripe using your secret key (server-side only) and returns a real
  // Stripe Checkout URL to redirect the customer to.
  //
  // Before this works you need to, in your Netlify site settings:
  //   1. Set the STRIPE_SECRET_KEY environment variable (see README.md).
  //   2. Deploy — Netlify Functions deploy automatically alongside the site.
  const buyBtn = document.getElementById('buyBtn');
  const checkoutNote = document.getElementById('checkoutNote');

  buyBtn.addEventListener('click', async () => {
    buyBtn.disabled = true;
    const originalText = buyBtn.textContent;
    buyBtn.textContent = 'Redirecting to checkout…';
    checkoutNote.classList.remove('show');

    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size: selectedSize, qty }),
      });

      if (!res.ok) throw new Error('Checkout request failed');
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      checkoutNote.classList.add('show');
      checkoutNote.textContent = 'Checkout isn\'t connected yet — see README.md to add your Stripe key.';
      buyBtn.disabled = false;
      buyBtn.textContent = originalText;
    }
  });

  // --- Size chart modal ---
  const sizeChartOpen = document.getElementById('sizeChartOpen');
  const sizeChartClose = document.getElementById('sizeChartClose');
  const sizeChartOverlay = document.getElementById('sizeChartOverlay');

  function openSizeChart() {
    sizeChartOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeSizeChart() {
    sizeChartOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (sizeChartOpen) sizeChartOpen.addEventListener('click', openSizeChart);
  if (sizeChartClose) sizeChartClose.addEventListener('click', closeSizeChart);
  if (sizeChartOverlay) {
    sizeChartOverlay.addEventListener('click', (e) => {
      if (e.target === sizeChartOverlay) closeSizeChart();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSizeChart();
  });

  // --- Nav background solidify on scroll (subtle) ---
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      nav.style.background = 'rgba(12,12,13,0.92)';
    } else {
      nav.style.background = 'linear-gradient(to bottom, rgba(12,12,13,0.92), rgba(12,12,13,0))';
    }
  }, { passive: true });

});
