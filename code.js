/* =========================================================================
   1. إعدادات الخادم والـ API
   ========================================================================= */
// التبديل التلقائي: إذا كان الموقع يعمل على Render (HTTPS) يستخدم البروكسي /api-proxy
// أما إذا كان يعمل محلياً (HTTP) يتصل مباشرة بالسيرفر
const API_BASE_URL = (window.location.protocol === 'https:' || window.location.hostname.includes('render.com'))
  ? "/api-proxy" 
  : "http://smg.runasp.net/api";

let targetWhatsAppNumber = "963985083231";

// دالة لضبط المسار ومنع تكرار /api
function formatEndpoint(endpoint) {
  let clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (clean.startsWith('/api/')) {
    clean = clean.substring(4); // إزالة /api الزائدة
  }
  return clean;
}

async function apiGet(endpoint) {
  try {
    const url = `${API_BASE_URL}${formatEndpoint(endpoint)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[API Error] Failed to GET ${endpoint}:`, err);
    return null;
  }
}

async function apiPost(endpoint, bodyData) {
  try {
    const url = `${API_BASE_URL}${formatEndpoint(endpoint)}`;
    const res = await fetch(url, {
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
let loadedProductsMap = new Map();

// قراءة السلة بأمان من التخزين المحلي
let cart = [];
try {
  const savedCart = localStorage.getItem('smg_b2b_cart');
  cart = savedCart ? JSON.parse(savedCart) : [];
  if (!Array.isArray(cart)) cart = [];
} catch (e) {
  console.warn('Resetting corrupt cart from localStorage');
  cart = [];
}

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

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* =========================================================================
   3. دوال تحميل البيانات من الـ API
   ========================================================================= */

async function loadSiteSettings() {
  const data = await apiGet('/Settings/contact');
  const phone = data?.PhoneNumber || data?.phoneNumber;
  if (phone) {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('00')) clean = clean.substring(2);
    targetWhatsAppNumber = clean;
  }
}

async function loadBanners() {
  const banners = (await apiGet('/Banners?onlyActive=true')) || [];
  const swiperWrapper = document.getElementById('heroBannersWrapper');
  const section = document.getElementById('offersSection');
  
  if (!swiperWrapper || !section) return;

  if (banners.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  banners.sort((a, b) => ((a.DisplayOrder ?? a.displayOrder ?? 0) - (b.DisplayOrder ?? b.displayOrder ?? 0)));

  swiperWrapper.innerHTML = banners.map((b, idx) => {
    const title = b.Title ?? b.title ?? 'عرض خاص';
    const image = b.ImageUrl ?? b.imageUrl ?? '';
    const linkUrl = b.LinkUrl ?? b.linkUrl ?? '';
    const clickAction = linkUrl ? `window.open('${escapeHTML(linkUrl)}', '_blank')` : `openOffersPage()`;

    return `
      <div class="swiper-slide">
        <div class="promo-banner banner-theme-${(idx % 4) + 1}">
          <div class="banner-badge-box">
            ${image ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" style="max-width:85%;max-height:85%;object-fit:contain;">` : '<i class="fa-solid fa-tag"></i>'}
          </div>
          <div class="banner-details">
            <h2>${escapeHTML(title)}</h2>
            <p>تجهيزات وعروض حصرية من SMG</p>
            <button type="button" class="btn-cta" onclick="${clickAction}">
              <span>${translations[currentLang].bannerCta}</span>
              <i class="fa-solid fa-arrow-left arrow-icon"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // تفادي Swiper Loop Warning بحساب عدد الشرائح
  if (swiperHeroInstance) swiperHeroInstance.destroy(true, true);
  const heroEl = document.querySelector('.swiper-hero');
  if (heroEl && banners.length > 0) {
    swiperHeroInstance = new Swiper(heroEl, {
      loop: banners.length > 1,
      speed: 600,
      observer: true,
      observeParents: true,
      autoplay: banners.length > 1 ? { delay: 4500, disableOnInteraction: false } : false,
      pagination: { el: '.hero-pagination', clickable: true }
    });
  }
}

async function loadManufacturers() {
  loadedManufacturersData = (await apiGet('/Manufacturers')) || [];
  
  const container = document.getElementById('companiesContainer');
  const section = document.getElementById('brandsSection');
  if (!container || !section) return;

  if (loadedManufacturersData.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  container.innerHTML = loadedManufacturersData.map(m => {
    const id = m.Id ?? m.id;
    const name = m.Name ?? m.name ?? '';
    const logo = m.LogoUrl ?? m.logoUrl ?? '';

    return `
      <div class="swiper-slide">
        <div class="entity-card" data-company-id="${id}" onclick="handleCompanyClick(${id})">
          <div class="entity-icon">
            ${logo ? `<img src="${escapeHTML(logo)}" alt="${escapeHTML(name)}" style="max-width:80%;max-height:80%;object-fit:contain;">` : '<i class="fa-solid fa-briefcase-medical"></i>'}
          </div>
          <span class="entity-label">${escapeHTML(name)}</span>
        </div>
      </div>
    `;
  }).join('');

  if (swiperCompaniesInstance) swiperCompaniesInstance.update();
}

async function loadCategories() {
  const endpoint = filterState.company ? `/Categories?manufacturerId=${filterState.company}` : '/Categories';
  loadedCategoriesData = (await apiGet(endpoint)) || [];
  
  const container = document.getElementById('categoriesContainer');
  const section = document.getElementById('categoriesSection');
  if (!container || !section) return;

  if (loadedCategoriesData.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  container.innerHTML = loadedCategoriesData.map(c => {
    const id = c.Id ?? c.id;
    const name = c.Name ?? c.name ?? '';
    const image = c.ImageUrl ?? c.imageUrl ?? '';

    return `
      <div class="swiper-slide">
        <div class="entity-card" data-category-id="${id}" onclick="handleCategoryClick(${id})">
          <div class="entity-icon">
            ${image ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(name)}" style="max-width:80%;max-height:80%;object-fit:contain;">` : '<i class="fa-solid fa-tooth"></i>'}
          </div>
          <span class="entity-label">${escapeHTML(name)}</span>
        </div>
      </div>
    `;
  }).join('');

  if (swiperCategoriesInstance) swiperCategoriesInstance.update();
}

function renderAllCompaniesPage() {
  const container = document.getElementById('allCompaniesGrid');
  if (!container) return;
  container.innerHTML = loadedManufacturersData.map(m => {
    const id = m.Id ?? m.id;
    const name = m.Name ?? m.name ?? '';
    const logo = m.LogoUrl ?? m.logoUrl ?? '';
    return `
      <div class="entity-card" onclick="handleCompanyClick(${id})">
        <div class="entity-icon">
          ${logo ? `<img src="${escapeHTML(logo)}" alt="${escapeHTML(name)}" style="max-width:80%;max-height:80%;object-fit:contain;">` : '<i class="fa-solid fa-briefcase-medical"></i>'}
        </div>
        <span class="entity-label">${escapeHTML(name)}</span>
      </div>
    `;
  }).join('');
}

function renderAllCategoriesPage() {
  const container = document.getElementById('allCategoriesGrid');
  if (!container) return;
  container.innerHTML = loadedCategoriesData.map(c => {
    const id = c.Id ?? c.id;
    const name = c.Name ?? c.name ?? '';
    const image = c.ImageUrl ?? c.imageUrl ?? '';
    return `
      <div class="entity-card" onclick="handleCategoryClick(${id})">
        <div class="entity-icon">
          ${image ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(name)}" style="max-width:80%;max-height:80%;object-fit:contain;">` : '<i class="fa-solid fa-tooth"></i>'}
        </div>
        <span class="entity-label">${escapeHTML(name)}</span>
      </div>
    `;
  }).join('');
}

/* =========================================================================
   4. جلب المنتجات والعروض
   ========================================================================= */
async function fetchProductsFromAPI() {
  if (currentView === 'new-arrivals') {
    return (await apiGet('/Products/new-arrivals?page=1&pageSize=40')) || [];
  }

  if (filterState.onlyOffers || currentView === 'offers') {
    const offers = (await apiGet('/Offers')) || [];
    const now = new Date();
    
    const validOfferProductIds = [
      ...new Set(
        offers
          .filter(o => (o.IsActive ?? o.isActive) && (o.ProductId ?? o.productId) && (!(o.EndDate ?? o.endDate) || new Date(o.EndDate ?? o.endDate) >= now))
          .map(o => o.ProductId ?? o.productId)
      )
    ];

    if (validOfferProductIds.length === 0) return [];
    const productPromises = validOfferProductIds.map(id => apiGet(`/Products/${id}`));
    const fetchedProducts = await Promise.all(productPromises);
    return fetchedProducts.filter(p => p !== null);
  }

  const params = new URLSearchParams();
  if (filterState.category) params.append('categoryId', filterState.category);
  if (filterState.company)  params.append('manId', filterState.company);
  if (filterState.searchQuery) params.append('searchTerm', filterState.searchQuery);
  params.append('page', '1');
  params.append('pageSize', '40');

  return (await apiGet(`/Products?${params.toString()}`)) || [];
}

/* =========================================================================
   5. إدارة الواجهات والتنقل (View Controller)
   ========================================================================= */
function switchView(viewName) {
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
    const homeBtn = document.getElementById('navHomeBtn');
    if (homeBtn) homeBtn.classList.add('active');
    if (homeSections) homeSections.style.display = 'block';
    
    filterState.onlyOffers = false;
    filterState.onlyNew = false;
    filterState.company = null;
    filterState.category = null;
    filterState.searchQuery = "";
    const searchInp = document.getElementById('searchInput');
    if (searchInp) searchInp.value = "";

    updateEntitySelectedUI();

    setTimeout(() => {
      if (swiperHeroInstance) swiperHeroInstance.update();
      if (swiperCompaniesInstance) swiperCompaniesInstance.update();
      if (swiperCategoriesInstance) swiperCategoriesInstance.update();
    }, 50);

  } else if (viewName === 'offers') {
    const offersBtn = document.getElementById('navOffersBtn');
    if (offersBtn) offersBtn.classList.add('active');
    if (catalogSection) catalogSection.style.display = 'block';
    
    filterState.onlyOffers = true;
    filterState.onlyNew = false;
    filterState.company = null;
    filterState.category = null;
    if (mainTitleEl) mainTitleEl.textContent = translations[currentLang].productsOffersTitle;
    renderProducts();

  } else if (viewName === 'new-arrivals') {
    const newBtn = document.getElementById('navNewBtn');
    if (newBtn) newBtn.classList.add('active');
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
    const cartBtn = document.getElementById('navCartBtn');
    if (cartBtn) cartBtn.classList.add('active');
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
   6. تهيئة Swipers
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
  if (swiperCompaniesInstance) swiperCompaniesInstance.destroy(true, true);
  if (swiperCategoriesInstance) swiperCategoriesInstance.destroy(true, true);

  const compEl = document.querySelector('.swiper-companies');
  if (compEl) {
    swiperCompaniesInstance = new Swiper(compEl, manualSwiperOptions);
  }

  const catEl = document.querySelector('.swiper-categories');
  if (catEl) {
    swiperCategoriesInstance = new Swiper(catEl, manualSwiperOptions);
  }
}

/* =========================================================================
   7. دوال العرض ورسم المنتجات
   ========================================================================= */
function updateEntitySelectedUI() {
  document.querySelectorAll('[data-company-id]').forEach(el => {
    const id = parseInt(el.getAttribute('data-company-id'), 10);
    if (filterState.company === id) el.classList.add('selected');
    else el.classList.remove('selected');
  });

  document.querySelectorAll('[data-category-id]').forEach(el => {
    const id = parseInt(el.getAttribute('data-category-id'), 10);
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
    const brandObj = loadedManufacturersData.find(b => (b.Id ?? b.id) === filterState.company);
    const brandName = brandObj ? (brandObj.Name ?? brandObj.name) : filterState.company;
    chipsHTML += `<span class="chip">${escapeHTML(brandName)} <i class="fa-solid fa-xmark" onclick="removeCompanyFilter()"></i></span>`;
  }

  if (filterState.category) {
    const catObj = loadedCategoriesData.find(c => (c.Id ?? c.id) === filterState.category);
    const catLabel = catObj ? (catObj.Name ?? catObj.name) : filterState.category;
    chipsHTML += `<span class="chip">${escapeHTML(catLabel)} <i class="fa-solid fa-xmark" onclick="removeCategoryFilter()"></i></span>`;
  }

  if (filterState.searchQuery) {
    chipsHTML += `<span class="chip">بحث: "${escapeHTML(filterState.searchQuery)}" <i class="fa-solid fa-xmark" onclick="clearSearch()"></i></span>`;
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

  loadedProductsMap.clear();
  products.forEach(p => loadedProductsMap.set(p.Id ?? p.id, p));

  container.innerHTML = products.map(p => {
    const pId = p.Id ?? p.id;
    const pName = p.Name ?? p.name ?? '';
    const variants = p.Variants ?? p.variants;
    const variant = (variants && variants.length > 0) ? variants[0] : null;
    const companyName = variant ? (variant.ManufacturerName ?? variant.manufacturerName) : (p.CategoryName ?? p.categoryName ?? 'SMG');
    const productCode = variant ? (variant.ProductNumber ?? variant.productNumber) : `SMG-${pId}`;

    let badgeHTML = '';
    if (currentView === 'offers' || filterState.onlyOffers) {
      badgeHTML = `<span class="product-badge badge-offer"><i class="fa-solid fa-tag"></i> عرض خاص</span>`;
    } else if (currentView === 'new-arrivals') {
      badgeHTML = `<span class="product-badge badge-new"><i class="fa-solid fa-wand-magic-sparkles"></i> مضاف حديثاً</span>`;
    }

    return `
      <div class="product-card" id="card-${pId}">
        <div>
          <div class="product-head">
            <span class="product-company"><i class="fa-solid fa-tooth"></i> ${escapeHTML(companyName)}</span>
            ${badgeHTML}
          </div>
          <div class="product-info">
            <h4>${escapeHTML(pName)}</h4>
            <span class="product-code">${translations[currentLang].codeText} ${escapeHTML(productCode)}</span>
          </div>
        </div>
        <div class="product-action-row">
          <div class="qty-control">
            <button type="button" class="qty-btn" onclick="updateCardQty(${pId}, 1)">+</button>
            <span class="qty-count" id="qty-${pId}">1</span>
            <button type="button" class="qty-btn" onclick="updateCardQty(${pId}, -1)">-</button>
          </div>
          <button type="button" class="btn-add-cart" onclick="addProductToCartById(${pId})">
            <i class="fa-solid fa-cart-plus"></i>
            <span>${translations[currentLang].addToCart}</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/* =========================================================================
   8. إدارة السلة وتوليد الطلب
   ========================================================================= */
window.updateCardQty = function(productId, delta) {
  const el = document.getElementById(`qty-${productId}`);
  if (!el) return;
  let val = parseInt(el.textContent, 10) || 1;
  val = Math.max(1, val + delta);
  el.textContent = val;
};

window.addProductToCartById = function(productId) {
  const product = loadedProductsMap.get(productId);
  if (!product) return;

  const pId = product.Id ?? product.id;
  const pName = product.Name ?? product.name;
  const variants = product.Variants ?? product.variants;
  const variant = (variants && variants.length > 0) ? variants[0] : null;
  const variantId = variant ? (variant.Id ?? variant.id) : null;
  const companyName = variant ? (variant.ManufacturerName ?? variant.manufacturerName) : (product.CategoryName ?? product.categoryName ?? 'SMG');
  const productCode = variant ? (variant.ProductNumber ?? variant.productNumber) : `SMG-${pId}`;

  const qtyEl = document.getElementById(`qty-${productId}`);
  const quantityToAdd = qtyEl ? (parseInt(qtyEl.textContent, 10) || 1) : 1;
  const cartKey = `${pId}_${variantId || 0}`;

  const existingIndex = cart.findIndex(item => item.cartKey === cartKey);
  if (existingIndex > -1) {
    cart[existingIndex].qty += quantityToAdd;
  } else {
    cart.push({
      cartKey: cartKey,
      id: pId,
      variantId: variantId,
      name: pName,
      code: productCode,
      company: companyName,
      qty: quantityToAdd
    });
  }

  saveCart();
  showToastNotice(`تمت إضافة (${quantityToAdd}) من ${pName} إلى السلة`);
  if (qtyEl) qtyEl.textContent = '1';
};

function saveCart() {
  try {
    localStorage.setItem('smg_b2b_cart', JSON.stringify(cart));
  } catch (e) {
    console.error('Failed to save cart to localStorage:', e);
  }
  updateCartBadge();
  if (currentView === 'cart') renderCartPage();
}

function updateCartBadge() {
  const badge = document.getElementById('cartCountBadge');
  if (!badge) return;
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = totalCount;
}

window.changeCartItemQty = function(cartKey, delta) {
  const idx = cart.findIndex(i => i.cartKey === cartKey);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart();
};

window.removeCartItem = function(cartKey) {
  cart = cart.filter(i => i.cartKey !== cartKey);
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

  container.innerHTML = `
    <div class="cart-page-layout">
      <div class="cart-items-container">
        ${cart.map(item => `
          <div class="cart-page-item">
            <div class="cart-item-details">
              <strong>${escapeHTML(item.name)}</strong>
              <span>${escapeHTML(item.company)} | ${escapeHTML(item.code)}</span>
            </div>
            <div class="cart-item-interactive">
              <div class="qty-control">
                <button class="qty-btn" onclick="changeCartItemQty('${item.cartKey}', 1)">+</button>
                <span class="qty-count">${item.qty}</span>
                <button class="qty-btn" onclick="changeCartItemQty('${item.cartKey}', -1)">-</button>
              </div>
              <button class="btn-remove-cart" onclick="removeCartItem('${item.cartKey}')" title="حذف">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        `).join('')}
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
  const originalBtnHTML = btn ? btn.innerHTML : '';
  if (btn) {
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="font-size: 20px;"></i> <span>جاري تسجيل الطلب...</span>`;
    btn.disabled = true;
  }

  const orderPayload = {
    Items: cart.map(item => ({
      ProductId: item.id,
      ProductVariantId: item.variantId || null,
      Name: item.name,
      Quantity: item.qty
    })),
    Notes: "طلب مرسل من المنصة لتأكيد التسعيرة عبر الواتساب"
  };

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

  const encodedURL = `https://wa.me/${targetWhatsAppNumber}?text=${encodeURIComponent(msg)}`;

  const isSuccess = await apiPost('/Orders/whatsapp', orderPayload);

  if (btn) {
    btn.innerHTML = originalBtnHTML;
    btn.disabled = false;
  }

  window.location.href = encodedURL;

  if (isSuccess) {
    cart = [];
    saveCart();
  } else {
    showToastNotice(currentLang === 'ar' ? "حدث خطأ في المزامنة الداخلية، جاري نقلك للواتساب..." : "Internal sync failed, redirecting to WhatsApp...");
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
   9. دوال التصفية والنقر
   ========================================================================= */
window.handleCompanyClick = function(brandId) {
  filterState.company = brandId;
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
   10. تهيئة الصفحة والأحداث
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

  const navHomeBtn = document.getElementById('navHomeBtn');
  const navOffersBtn = document.getElementById('navOffersBtn');
  const navNewBtn = document.getElementById('navNewBtn');
  const navCartBtn = document.getElementById('navCartBtn');

  if (navHomeBtn) navHomeBtn.onclick = () => switchView('home');
  if (navOffersBtn) navOffersBtn.onclick = () => switchView('offers');
  if (navNewBtn) navNewBtn.onclick = () => switchView('new-arrivals');
  if (navCartBtn) navCartBtn.onclick = () => switchView('cart');
  if (brandLogo) brandLogo.onclick = () => switchView('home');

  let searchTimeout;
  if (searchInput) {
    searchInput.oninput = (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filterState.searchQuery = e.target.value.trim();
        if (filterState.searchQuery !== '') {
          switchView('filtered');
        } else if (!filterState.company && !filterState.category && !filterState.onlyOffers && !filterState.onlyNew) {
          switchView('home');
        } else {
          renderProducts();
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
      } else {
        const compTitle = document.querySelector('[data-i18n="allCompaniesTitle"]');
        const catTitle = document.querySelector('[data-i18n="allCategoriesTitle"]');
        if (compTitle) compTitle.textContent = translations[currentLang].allCompaniesTitle;
        if (catTitle) catTitle.textContent = translations[currentLang].allCategoriesTitle;
        if (mainTitleEl) mainTitleEl.textContent = translations[currentLang].productsCatalogTitle;
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
