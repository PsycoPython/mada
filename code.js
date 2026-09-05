/* =========================================================================
   1. إعدادات الخادم والـ API
   ========================================================================= */
const API_BASE_URL = "http://smg.runasp.net"; 
let targetWhatsAppNumber = "963985083231";

async function apiGet(endpoint) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[API Error] Failed to GET ${endpoint}:`, err);
    return null;
  }
}

async function apiPost(endpoint, bodyData) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });
    return res.ok;
  } catch (err) {
    console.error(`[API Error] Failed to POST ${endpoint}:`, err);
    return false;
  }
}

/* =========================================================================
   2. إدارة الحالة والترجمات (State Management)
   ========================================================================= */
let currentView = 'home'; 

const filterState = {
  company: null,
  category: null,
  searchQuery: "",
  onlyOffers: false,
  onlyNew: false
};

let swiperHeroInstance = null;
let swiperCompaniesInstance = null;
let swiperCategoriesInstance = null;

let loadedManufacturersData = [];
let loadedCategoriesData = [];

let cart = JSON.parse(localStorage.getItem('smg_b2b_cart')) || [];
let currentLang = 'ar';

const translations = {
  ar: {
    tagline: 'Smart Medical Group',
    navHome: 'الرئيسية',
    navOffers: 'العروض',
    navNewArrivals: 'وصل حديثاً',
    navCart: 'السلة',
    searchPlaceholder: 'ابحث باسم المنتج، الكود، أو الشركة...',
    bannerCta: 'استعراض المواد',
    browseCompanies: 'أبرز الشركات والماركات',
    categoriesTitle: 'التصنيفات الرئيسية',
    viewAll: 'عرض الكل',
    allCompaniesTitle: 'جميع الشركات والماركات',
    allCategoriesTitle: 'جميع التصنيفات الطبية',
    backToHome: 'العودة للرئيسية',
    productsCatalogTitle: 'نتائج البحث والمواد المحددة',
    productsOffersTitle: 'جميع العروض والخصومات الخاصة',
    productsNewTitle: 'جميع المواد والتجهيزات المضافة حديثاً',
    resetFilters: 'مسح التصفية والعودة',
    cartTitle: 'سلة الطلبات والتسعيرات',
    continueShopping: 'العودة للتسوق',
    orderSummary: 'ملخص الطلبية',
    totalItems: 'إجمالي المواد:',
    totalQuantity: 'مجموع الكميات:',
    sendOrderBtn: 'إرسال الطلبية كاملة عبر واتساب',
    addToCart: 'إضافة للسلة',
    codeText: 'كود:',
    emptyCart: 'سلة الطلبات فارغة حالياً. ابدأ بتجميع المواد المطلوبة!',
    emptyCartSub: 'تصفح منتجاتنا المميزة وأضف الكميات المناسبة لعيادتك',
    startShopping: 'ابدأ تصفح المواد الآن',
    noProductsFound: 'لم يتم العثور على مواد مطابقة.',
    footerRights: 'جميع الحقوق محفوظة © 2026 Smart Medical Group (SMG).'
  },
  en: {
    tagline: 'Smart Medical Group',
    navHome: 'Home',
    navOffers: 'Offers',
    navNewArrivals: 'New Arrivals',
    navCart: 'Cart',
    searchPlaceholder: 'Search by product name, code, or brand...',
    bannerCta: 'Explore Items',
    browseCompanies: 'Leading International Brands',
    categoriesTitle: 'Main Categories',
    viewAll: 'View All',
    allCompaniesTitle: 'All Brands & Companies',
    allCategoriesTitle: 'All Medical Categories',
    backToHome: 'Back to Home',
    productsCatalogTitle: 'Search Results & Filtered Supplies',
    productsOffersTitle: 'All Special Deals & Offers',
    productsNewTitle: 'All New Arrival Products',
    resetFilters: 'Clear Filters & Back',
    cartTitle: 'Quotation Order Cart',
    continueShopping: 'Back to Catalog',
    orderSummary: 'Order Summary',
    totalItems: 'Total Items:',
    totalQuantity: 'Total Quantity:',
    sendOrderBtn: 'Send Order via WhatsApp',
    addToCart: 'Add to Cart',
    codeText: 'Code:',
    emptyCart: 'Your cart is empty. Start adding required items!',
    emptyCartSub: 'Browse our supplies and add quantities for your clinic',
    startShopping: 'Start Browsing Supplies',
    noProductsFound: 'No matching items found.',
    footerRights: 'All Rights Reserved © 2026 Smart Medical Group (SMG).'
  }
};

/* =========================================================================
   3. دوال تحميل البيانات من الـ API
   ========================================================================= */

async function loadSiteSettings() {
  const data = await apiGet('/api/Settings/contact');
  if (data && data.PhoneNumber) {
    targetWhatsAppNumber = data.PhoneNumber.replace(/[^0-9]/g, '');
  }
}

async function loadBanners() {
  const banners = await apiGet('/api/Banners?onlyActive=true') || [];
  const swiperWrapper = document.getElementById('heroBannersWrapper');
  const section = document.getElementById('offersSection');
  
  if (!swiperWrapper || !section) return;

  if (banners.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  swiperWrapper.innerHTML = banners.map((b, idx) => `
    <div class="swiper-slide">
      <div class="promo-banner banner-theme-${(idx % 4) + 1}">
        <div class="banner-badge-box">
          ${b.ImageUrl ? `<img src="${b.ImageUrl}" alt="${b.Title || ''}" style="max-width:85%;max-height:85%;">` : '<i class="fa-solid fa-tag"></i>'}
        </div>
        <div class="banner-details">
          <h2>${b.Title || 'عرض خاص'}</h2>
          <p>${b.Subtitle || 'تجهيزات وعروض حصرية من SMG'}</p>
          <button type="button" class="btn-cta" onclick="openOffersPage()">
            <span>${translations[currentLang].bannerCta}</span>
            <i class="fa-solid fa-arrow-left arrow-icon"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  if (swiperHeroInstance) swiperHeroInstance.destroy(true, true);
  swiperHeroInstance = new Swiper('.swiper-hero', {
    loop: true,
    speed: 600,
    observer: true,
    observeParents: true,
    autoplay: { delay: 4500, disableOnInteraction: false, pauseOnMouseEnter: true },
    pagination: { el: '.hero-pagination', clickable: true }
  });
}

async function loadManufacturers() {
  loadedManufacturersData = await apiGet('/api/Manufacturers') || [];
  
  const container = document.getElementById('companiesContainer');
  const section = document.getElementById('brandsSection');
  if (!container || !section) return;

  if (loadedManufacturersData.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  container.innerHTML = loadedManufacturersData.map(m => `
    <div class="swiper-slide">
      <div class="entity-card" data-company-id="${m.Id}" onclick="handleCompanyClick(${m.Id})">
        <div class="entity-icon">
          ${m.LogoUrl ? `<img src="${m.LogoUrl}" alt="${m.Name}" style="max-width:80%;max-height:80%;object-fit:contain;">` : '<i class="fa-solid fa-briefcase-medical"></i>'}
        </div>
        <span class="entity-label">${m.Name}</span>
      </div>
    </div>
  `).join('');

  if (swiperCompaniesInstance) swiperCompaniesInstance.destroy(true, true);
  swiperCompaniesInstance = new Swiper('.swiper-companies', manualSwiperOptions);
}

async function loadCategories() {
  const endpoint = filterState.company ? `/api/Categories?manufacturerId=${filterState.company}` : '/api/Categories';
  loadedCategoriesData = await apiGet(endpoint) || [];
  
  const container = document.getElementById('categoriesContainer');
  const section = document.getElementById('categoriesSection');
  if (!container || !section) return;

  if (loadedCategoriesData.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  container.innerHTML = loadedCategoriesData.map(c => `
    <div class="swiper-slide">
      <div class="entity-card" data-category-id="${c.Id}" onclick="handleCategoryClick(${c.Id})">
        <div class="entity-icon">
          ${c.ImageUrl ? `<img src="${c.ImageUrl}" alt="${c.Name}" style="max-width:80%;max-height:80%;object-fit:contain;">` : '<i class="fa-solid fa-tooth"></i>'}
        </div>
        <span class="entity-label">${c.Name}</span>
      </div>
    </div>
  `).join('');

  if (swiperCategoriesInstance) swiperCategoriesInstance.destroy(true, true);
  swiperCategoriesInstance = new Swiper('.swiper-categories', manualSwiperOptions);
}

function renderAllCompaniesPage() {
  const container = document.getElementById('allCompaniesGrid');
  if (!container) return;
  container.innerHTML = loadedManufacturersData.map(m => `
    <div class="entity-card" onclick="handleCompanyClick(${m.Id})">
      <div class="entity-icon">
        ${m.LogoUrl ? `<img src="${m.LogoUrl}" alt="${m.Name}" style="max-width:80%;max-height:80%;object-fit:contain;">` : '<i class="fa-solid fa-briefcase-medical"></i>'}
      </div>
      <span class="entity-label">${m.Name}</span>
    </div>
  `).join('');
}

function renderAllCategoriesPage() {
  const container = document.getElementById('allCategoriesGrid');
  if (!container) return;
  container.innerHTML = loadedCategoriesData.map(c => `
    <div class="entity-card" onclick="handleCategoryClick(${c.Id})">
      <div class="entity-icon">
        ${c.ImageUrl ? `<img src="${c.ImageUrl}" alt="${c.Name}" style="max-width:80%;max-height:80%;object-fit:contain;">` : '<i class="fa-solid fa-tooth"></i>'}
      </div>
      <span class="entity-label">${c.Name}</span>
    </div>
  `).join('');
}

async function fetchProductsFromAPI() {
  if (currentView === 'new-arrivals') {
    return (await apiGet('/api/Products/new-arrivals?page=1&pageSize=40')) || [];
  }

  const params = new URLSearchParams();
  if (filterState.category) params.append('categoryId', filterState.category);
  if (filterState.company)  params.append('manId', filterState.company);
  if (filterState.searchQuery) params.append('searchTerm', filterState.searchQuery);
  params.append('page', '1');
  params.append('pageSize', '40');

  const products = (await apiGet(`/api/Products?${params.toString()}`)) || [];

  if (filterState.onlyOffers) {
    const offers = (await apiGet('/api/Offers')) || [];
    const activeOfferProductIds = new Set(offers.filter(o => o.IsActive).map(o => o.ProductId));
    return products.filter(p => activeOfferProductIds.has(p.Id));
  }

  return products;
}

/* =========================================================================
   4. إدارة الواجهات والتنقل (View Controller)
   ========================================================================= */
async function switchView(viewName) {
  currentView = viewName;
  const homeSections = document.getElementById('homeExtraSections');
  const catalogSection = document.getElementById('productsCatalogSection');
  const cartPageSection = document.getElementById('cartPageSection');
  const searchBar = document.getElementById('searchBarSection');
  const allCompaniesSection = document.getElementById('allCompaniesSection');
  const allCategoriesSection = document.getElementById('allCategoriesSection');
  const mainTitleEl = document.getElementById('catalogMainTitle');

  document.querySelectorAll('.main-navigation .nav-tab-btn').forEach(btn => btn.classList.remove('active'));

  if (homeSections) homeSections.style.display = 'none';
  if (catalogSection) catalogSection.style.display = 'none';
  if (cartPageSection) cartPageSection.style.display = 'none';
  if (allCompaniesSection) allCompaniesSection.style.display = 'none';
  if (allCategoriesSection) allCategoriesSection.style.display = 'none';
  if (searchBar) searchBar.style.display = 'block';

  if (viewName === 'home') {
    document.getElementById('navHomeBtn').classList.add('active');
    if (homeSections) homeSections.style.display = 'block';
    
    filterState.onlyOffers = false;
    filterState.onlyNew = false;
    filterState.company = null;
    filterState.category = null;
    filterState.searchQuery = "";
    const searchInp = document.getElementById('searchInput');
    if (searchInp) searchInp.value = "";

    await loadCategories();
    updateEntitySelectedUI();

  } else if (viewName === 'offers') {
    document.getElementById('navOffersBtn').classList.add('active');
    if (catalogSection) catalogSection.style.display = 'block';
    
    filterState.onlyOffers = true;
    filterState.onlyNew = false;
    filterState.company = null;
    filterState.category = null;
    if (mainTitleEl) mainTitleEl.textContent = translations[currentLang].productsOffersTitle;
    renderProducts();

  } else if (viewName === 'new-arrivals') {
    document.getElementById('navNewBtn').classList.add('active');
    if (catalogSection) catalogSection.style.display = 'block';
    
    filterState.onlyNew = true;
    filterState.onlyOffers = false;
    filterState.company = null;
    filterState.category = null;
    if (mainTitleEl) mainTitleEl.textContent = translations[currentLang].productsNewTitle;
    renderProducts();

  } else if (viewName === 'filtered') {
    if (catalogSection) catalogSection.style.display = 'block';
    if (mainTitleEl) mainTitleEl.textContent = translations[currentLang].productsCatalogTitle;
    renderProducts();

  } else if (viewName === 'cart') {
    document.getElementById('navCartBtn').classList.add('active');
    if (searchBar) searchBar.style.display = 'none';
    if (cartPageSection) cartPageSection.style.display = 'block';
    renderCartPage();

  } else if (viewName === 'all-companies') {
    if (allCompaniesSection) allCompaniesSection.style.display = 'block';
    renderAllCompaniesPage();

  } else if (viewName === 'all-categories') {
    if (allCategoriesSection) allCategoriesSection.style.display = 'block';
    renderAllCategoriesPage();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.openOffersPage = function() {
  switchView('offers');
};

/* =========================================================================
   5. تهيئة Swipers
   ========================================================================= */
const manualSwiperOptions = {
  loop: false,
  grabCursor: true,
  spaceBetween: 8,
  slidesPerView: 2.2,
  observer: true,
  observeParents: true,
  breakpoints: {
    340: { slidesPerView: 2.4, spaceBetween: 10 },
    480: { slidesPerView: 3.2, spaceBetween: 12 },
    768: { slidesPerView: 4.2, spaceBetween: 16 },
    1024: { slidesPerView: 5.2, spaceBetween: 18 },
    1280: { slidesPerView: 5.8, spaceBetween: 24 }
  }
};

function setupAllSwipers() {
  loadBanners();
  loadManufacturers();
  loadCategories();
}

/* =========================================================================
   6. دوال العرض ورسم كروت المنتجات
   ========================================================================= */
function updateEntitySelectedUI() {
  document.querySelectorAll('[data-company-id]').forEach(el => {
    const id = parseInt(el.getAttribute('data-company-id'));
    if (filterState.company === id) el.classList.add('selected');
    else el.classList.remove('selected');
  });

  document.querySelectorAll('[data-category-id]').forEach(el => {
    const id = parseInt(el.getAttribute('data-category-id'));
    if (filterState.category === id) el.classList.add('selected');
    else el.classList.remove('selected');
  });
}

function renderFilterStatusBar() {
  const bar = document.getElementById('filterStatusBar');
  const chipsContainer = document.getElementById('activeChipsContainer');
  if (!bar || !chipsContainer) return;

  const hasActiveFilters = filterState.company || filterState.category || filterState.searchQuery || filterState.onlyOffers || filterState.onlyNew;
  
  if (!hasActiveFilters) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  let chipsHTML = '';

  if (filterState.company) {
    const brandObj = loadedManufacturersData.find(b => b.Id === filterState.company);
    chipsHTML += `<span class="chip">${brandObj ? brandObj.Name : filterState.company} <i class="fa-solid fa-xmark" onclick="removeCompanyFilter()"></i></span>`;
  }

  if (filterState.category) {
    const catObj = loadedCategoriesData.find(c => c.Id === filterState.category);
    const catLabel = catObj ? catObj.Name : filterState.category;
    chipsHTML += `<span class="chip">${catLabel} <i class="fa-solid fa-xmark" onclick="removeCategoryFilter()"></i></span>`;
  }

  if (filterState.searchQuery) {
    chipsHTML += `<span class="chip">بحث: "${filterState.searchQuery}" <i class="fa-solid fa-xmark" onclick="clearSearch()"></i></span>`;
  }

  chipsContainer.innerHTML = chipsHTML;
}

async function renderProducts() {
  const container = document.getElementById('productsGridContainer');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
      <i class="fa-solid fa-circle-notch fa-spin fa-2x"></i>
      <p style="margin-top: 10px; font-weight: 700;">جاري تحميل المواد...</p>
    </div>
  `;
  
  updateEntitySelectedUI();
  renderFilterStatusBar();

  const products = await fetchProductsFromAPI();

  if (!products || products.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px 10px; color: var(--text-muted);">
        <i class="fa-solid fa-box-open" style="font-size: 36px; margin-bottom: 10px; color: var(--primary);"></i>
        <p style="font-weight: 700; font-size: 13px;">${translations[currentLang].noProductsFound}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(p => {
    const variant = (p.Variants && p.Variants.length > 0) ? p.Variants[0] : null;
    const companyName = variant?.ManufacturerName || p.CategoryName || 'SMG';
    const productCode = variant?.ProductNumber || `SMG-${p.Id}`;
    const variantId = variant ? variant.Id : '';

    let badgeHTML = '';
    if (currentView === 'offers' || filterState.onlyOffers) {
      badgeHTML = `<span class="product-badge badge-offer"><i class="fa-solid fa-tag"></i> عرض خاص</span>`;
    } else if (currentView === 'new-arrivals') {
      badgeHTML = `<span class="product-badge badge-new"><i class="fa-solid fa-wand-magic-sparkles"></i> مضاف حديثاً</span>`;
    }

    return `
      <div class="product-card" id="card-${p.Id}">
        <div class="product-head">
          <span class="product-company"><i class="fa-solid fa-tooth"></i> ${companyName}</span>
          ${badgeHTML}
        </div>
        <div class="product-info">
          <h4>${p.Name}</h4>
          <span class="product-code">${translations[currentLang].codeText} ${productCode}</span>
        </div>
        <div class="product-action-row">
          <div class="qty-control">
            <button type="button" class="qty-btn" onclick="updateCardQty(${p.Id}, 1)">+</button>
            <span class="qty-count" id="qty-${p.Id}">1</span>
            <button type="button" class="qty-btn" onclick="updateCardQty(${p.Id}, -1)">-</button>
          </div>
          <button type="button" class="btn-add-cart" 
            data-id="${p.Id}" 
            data-name="${encodeURIComponent(p.Name || '')}" 
            data-company="${encodeURIComponent(companyName)}" 
            data-code="${productCode}" 
            data-variant-id="${variantId}"
            onclick="handleAddCartClick(this)">
            <i class="fa-solid fa-cart-plus"></i>
            <span>${translations[currentLang].addToCart}</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.handleAddCartClick = function(buttonEl) {
  const productId = parseInt(buttonEl.getAttribute('data-id'));
  const name = decodeURIComponent(buttonEl.getAttribute('data-name'));
  const company = decodeURIComponent(buttonEl.getAttribute('data-company'));
  const code = buttonEl.getAttribute('data-code');
  const vIdAttr = buttonEl.getAttribute('data-variant-id');
  const variantId = vIdAttr !== "" ? parseInt(vIdAttr) : null;

  addProductToCart(productId, name, company, code, variantId);
};

/* =========================================================================
   7. إدارة السلة وتوليد الطلب
   ========================================================================= */
window.updateCardQty = function(productId, delta) {
  const el = document.getElementById(`qty-${productId}`);
  if (!el) return;
  let val = parseInt(el.textContent) || 1;
  val = Math.max(1, val + delta);
  el.textContent = val;
};

window.addProductToCart = function(productId, name, company, code, variantId) {
  const qtyEl = document.getElementById(`qty-${productId}`);
  const quantityToAdd = qtyEl ? parseInt(qtyEl.textContent) || 1 : 1;

  const existingIndex = cart.findIndex(item => item.id === productId && item.variantId === variantId);
  if (existingIndex > -1) {
    cart[existingIndex].qty += quantityToAdd;
  } else {
    cart.push({ id: productId, variantId: variantId, name: name, code: code, company: company, qty: quantityToAdd });
  }

  saveCart();
  showToastNotice(`تمت إضافة (${quantityToAdd}) من ${name} إلى السلة`);
  if (qtyEl) qtyEl.textContent = '1';
};

function saveCart() {
  localStorage.setItem('smg_b2b_cart', JSON.stringify(cart));
  updateCartBadge();
  if (currentView === 'cart') renderCartPage();
}

function updateCartBadge() {
  const badge = document.getElementById('cartCountBadge');
  if (!badge) return;
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = totalCount;
}

window.changeCartItemQty = function(id, delta) {
  const idx = cart.findIndex(i => i.id === id);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart();
};

window.removeCartItem = function(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
};

function renderCartPage() {
  const container = document.getElementById('cartPageContent');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-state">
        <i class="fa-solid fa-cart-arrow-down"></i>
        <h3>${translations[currentLang].emptyCart}</h3>
        <p>${translations[currentLang].emptyCartSub}</p>
        <button type="button" class="btn-cta" onclick="switchView('home')">
          <span>${translations[currentLang].startShopping}</span>
          <i class="fa-solid fa-arrow-left arrow-icon"></i>
        </button>
      </div>
    `;
    return;
  }

  const totalItemsCount = cart.length;
  const totalUnitsCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const itemsHTML = cart.map(item => `
    <div class="cart-item" id="cart-item-${item.id}">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <span class="product-code">${item.company || ''} ${item.company && item.code ? '|' : ''} ${item.code || ''}</span>
      </div>

      <div class="cart-item-actions">
        <div class="qty-control">
          <button type="button" class="qty-btn" onclick="changeCartItemQty(${item.id}, 1)">+</button>
          <span class="qty-count">${item.qty}</span>
          <button type="button" class="qty-btn" onclick="changeCartItemQty(${item.id}, -1)">-</button>
        </div>
        <button type="button" class="btn-delete-item" onclick="removeCartItem(${item.id})" title="حذف المنتج">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="cart-page-layout">
      <div class="cart-items-container">
        ${itemsHTML}
      </div>

      <div class="cart-summary-box">
        <h3 class="summary-title">${translations[currentLang].orderSummary}</h3>
        <div class="summary-row">
          <span>${translations[currentLang].totalItems}</span>
          <strong>${totalItemsCount}</strong>
        </div>
        <div class="summary-row">
          <span>${translations[currentLang].totalQuantity}</span>
          <strong>${totalUnitsCount}</strong>
        </div>
        <button type="button" class="btn-send-whatsapp-order" onclick="sendOrderViaWhatsApp()">
          <i class="fa-brands fa-whatsapp" style="font-size: 20px;"></i>
          <span>${translations[currentLang].sendOrderBtn}</span>
        </button>
      </div>
    </div>
  `;
}

window.sendOrderViaWhatsApp = async function() {
  if (cart.length === 0) {
    alert(translations[currentLang].emptyCart);
    return;
  }

  const btn = document.querySelector('.btn-send-whatsapp-order');
  if (!btn) return;
  const originalBtnHTML = btn.innerHTML;
  btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="font-size: 20px;"></i> <span>جاري تسجيل الطلب...</span>`;
  btn.disabled = true;

  const orderPayload = {
    Items: cart.map(item => ({
      ProductId: item.id,
      ProductVariantId: item.variantId || null,
      Name: item.name,
      Quantity: item.qty
    })),
    Notes: "طلب مرسل من المنصة لتأكيد التسعيرة عبر الواتساب"
  };
  
  const isSuccess = await apiPost('/api/Orders/whatsapp', orderPayload);

  let msg = `*طلب تسعيرة وتوريد جديد من Smart Medical Group (SMG)* 🩺🦷\n\n`;
  msg += `قائمة المواد والتجهيزات المطلوبة:\n`;
  msg += `--------------------------------\n`;

  cart.forEach((item, index) => {
    msg += `${index + 1}. *${item.name}*\n`;
    msg += `   • الشركة: ${item.company}\n`;
    msg += `   • الكود: ${item.code}\n`;
    msg += `   • الكمية: ${item.qty}\n\n`;
  });

  msg += `--------------------------------\n`;
  msg += `يرجى تزويدنا بتأكيد التوفر والتسعيرة المعتمدة. شكراً لكم!`;

  btn.innerHTML = originalBtnHTML;
  btn.disabled = false;

  const encodedURL = `https://wa.me/${targetWhatsAppNumber}?text=${encodeURIComponent(msg)}`;
  window.open(encodedURL, '_blank');

  if (isSuccess) {
    cart = [];
    saveCart();
    showToastNotice(currentLang === 'ar' ? "تم تسجيل طلبك بنجاح وتحويلك للواتساب" : "Order submitted successfully!");
  } else {
    showToastNotice(currentLang === 'ar' ? "تم تحويلك للواتساب، لكن حدث خطأ في المزامنة الداخلية." : "Redirected to WhatsApp, but internal sync failed.");
  }
};

function showToastNotice(text) {
  const toast = document.getElementById('toastNotice');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

/* =========================================================================
   8. دوال التصفية والنقر
   ========================================================================= */
window.handleCompanyClick = async function(brandId) {
  filterState.company = brandId;
  await loadCategories();
  switchView('filtered');
};

window.handleCategoryClick = function(catId) {
  filterState.category = catId;
  switchView('filtered');
};

window.removeCompanyFilter = function() {
  filterState.company = null;
  if (!filterState.category && !filterState.searchQuery && !filterState.onlyOffers && !filterState.onlyNew) {
    switchView('home');
  } else {
    renderProducts();
  }
};

window.removeCategoryFilter = function() {
  filterState.category = null;
  if (!filterState.company && !filterState.searchQuery && !filterState.onlyOffers && !filterState.onlyNew) {
    switchView('home');
  } else {
    renderProducts();
  }
};

window.clearSearch = function() {
  filterState.searchQuery = "";
  const input = document.getElementById('searchInput');
  if (input) input.value = "";
  if (!filterState.company && !filterState.category && !filterState.onlyOffers && !filterState.onlyNew) {
    switchView('home');
  } else {
    renderProducts();
  }
};

/* =========================================================================
   9. تهيئة الصفحة والأحداث
   ========================================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  setupAllSwipers();

  await loadSiteSettings();
  await loadBanners();
  await loadManufacturers();
  await loadCategories();

  const themeBtn = document.getElementById('themeBtn');
  const langBtn = document.getElementById('langBtn');
  const whatsappDirectBtn = document.getElementById('whatsappDirectBtn');
  const brandLogo = document.getElementById('brandLogo');
  const searchInput = document.getElementById('searchInput');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  if (resetFiltersBtn) {
    resetFiltersBtn.onclick = () => switchView('home');
  }

  if (themeBtn) {
    themeBtn.onclick = () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      themeBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    };
  }

  if (whatsappDirectBtn) {
    whatsappDirectBtn.onclick = () => {
      window.open(`https://wa.me/${targetWhatsAppNumber}?text=${encodeURIComponent('السلام عليكم و رحمة الله و بركاته')}`, '_blank');
    };
  }

  document.getElementById('navHomeBtn').onclick = () => switchView('home');
  document.getElementById('navOffersBtn').onclick = () => switchView('offers');
  document.getElementById('navNewBtn').onclick = () => switchView('new-arrivals');
  document.getElementById('navCartBtn').onclick = () => switchView('cart');
  if (brandLogo) brandLogo.onclick = () => switchView('home');

  let searchTimeout;
  if (searchInput) {
    searchInput.oninput = (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filterState.searchQuery = e.target.value;
        if (filterState.searchQuery.trim() !== '') {
          switchView('filtered');
        } else if (!filterState.company && !filterState.category && !filterState.onlyOffers && !filterState.onlyNew) {
          switchView('home');
        }
      }, 350);
    };
  }

  if (langBtn) {
    langBtn.onclick = () => {
      currentLang = currentLang === 'ar' ? 'en' : 'ar';
      document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', currentLang);
      langBtn.textContent = currentLang === 'ar' ? 'EN' : 'AR';

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        if (translations[currentLang][k]) el.textContent = translations[currentLang][k];
      });

      document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const k = el.getAttribute('data-i18n-ph');
        if (translations[currentLang][k]) el.setAttribute('placeholder', translations[currentLang][k]);
      });

      const mainTitleEl = document.getElementById('catalogMainTitle');
      if (currentView === 'offers' && mainTitleEl) {
        mainTitleEl.textContent = translations[currentLang].productsOffersTitle;
      } else if (currentView === 'new-arrivals' && mainTitleEl) {
        mainTitleEl.textContent = translations[currentLang].productsNewTitle;
      } else if (currentView === 'all-companies' || currentView === 'all-categories') {
        document.querySelector('[data-i18n="allCompaniesTitle"]').textContent = translations[currentLang].allCompaniesTitle;
        document.querySelector('[data-i18n="allCategoriesTitle"]').textContent = translations[currentLang].allCategoriesTitle;
      } else if (mainTitleEl) {
        mainTitleEl.textContent = translations[currentLang].productsCatalogTitle;
      }

      if (currentView === 'cart') renderCartPage();
      else if (currentView === 'filtered') renderProducts();
      else if (currentView === 'all-companies') renderAllCompaniesPage();
      else if (currentView === 'all-categories') renderAllCategoriesPage();

      setTimeout(() => setupAllSwipers(), 50);
    };
  }

  updateCartBadge();
  switchView('home');
});
