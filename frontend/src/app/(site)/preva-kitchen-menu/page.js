"use client";

import { useState, useEffect } from 'react';
import KitchenLoader from '@/components/KitchenLoader';
import SvgIcon from '@/components/SvgIcon';

const API = '/api';

const CATEGORY_ORDER = [
  'Preva Wings',
  'Preva Burger',
  'Quesadillas',
  'Tacos',
  'Preva Bites',
  'Pasta',
  'Salads',
  'Entrées',
  'Sides',
  'Dessert'
];

const MENU_ITEM_IMAGES = {
  'Preva Wings': 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Wings-768x768.jpg',
  'Preva Wings Chilli': 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Wings-Chilli-768x768.jpg',
  'Honey Hot': 'https://prevaclub.com/wp-content/uploads/2026/07/Hot-Honey-Wings.jpg',
  Buffalo: 'https://prevaclub.com/wp-content/uploads/2026/07/Buffalo-wings.jpg',
  BBQ: 'https://prevaclub.com/wp-content/uploads/2026/07/bbq.jpg',
  'Garlic Parmesan': 'https://prevaclub.com/wp-content/uploads/2026/07/Garlic-Parmesan.jpg',
  'Lemon Pepper': 'https://prevaclub.com/wp-content/uploads/2026/07/lemon-paper.jpg',
  Jerk: 'https://prevaclub.com/wp-content/uploads/2026/07/jerq.jpg',
  'Preva Burger': 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Burger-768x768.jpg',
  'Preva Double Smash Burger': 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Double-Smash-Burger-768x768.jpg',
  'Preva Quesadilla': 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Quesadilla-768x768.jpg',
  'Steak Quesadilla': 'https://prevaclub.com/wp-content/uploads/2026/07/Steak-Quesadilla-768x615.jpg',
  'Shrimp Quesadillas': 'https://prevaclub.com/wp-content/uploads/2026/07/Shrimp-Quesadillas-768x615.jpg',
  'Beef Quesadillas': 'https://prevaclub.com/wp-content/uploads/2026/07/quascode-768x615.jpg',
  'Veggie Quesadilla': 'https://prevaclub.com/wp-content/uploads/2026/07/Veggie-Quesadilla-768x615.jpg',
  'Shrimp Tacos': 'https://prevaclub.com/wp-content/uploads/2026/08/Shrimp-Tacos-768x768.jpg',
  'Steak Tacos': 'https://prevaclub.com/wp-content/uploads/2026/08/Steak-Tacos-768x768.jpg',
  'Chicken Tacos': 'https://prevaclub.com/wp-content/uploads/2026/07/Chicken-Tacos-768x615.jpg',
  'Catfish Bites': 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Catfish-768x768.jpg',
  'Lobster Bites': 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Lobster-768x768.jpg',
  'Steak Bites': 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Steak-Bites-768x768.jpg',
  'Veggie Pasta': 'https://prevaclub.com/wp-content/uploads/2026/07/Veggie-Pasta-768x615.jpg',
  'Rasta Pasta': 'https://prevaclub.com/wp-content/uploads/2026/08/Rasta-Pasta.webp',
  'House Salad': 'https://prevaclub.com/wp-content/uploads/2026/05/house-salad-1-1-768x768.jpg',
  'Lamb Chops': 'https://prevaclub.com/wp-content/uploads/2026/08/preva-Lamb-768x768.jpg',
  'Catfish Bites with Fries': 'https://prevaclub.com/wp-content/uploads/2026/07/Catfish-Bites-with-Fries-768x615.jpg',
  'Mac & Cheese': 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Mac-768x768.jpg',
  'Collard Greens with Turkey Meat': 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Greens-768x768.jpg',
  Yams: 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Yams-768x768.jpg',
  Fries: 'https://prevaclub.com/wp-content/uploads/2026/07/Fries.jpg',
  'Rice & Peas': 'https://prevaclub.com/wp-content/uploads/2026/07/Rice-Peas-768x615.jpg',
  'Fried Plantains': 'https://prevaclub.com/wp-content/uploads/2026/07/Fried-Plantains-768x615.jpg',
  'Steamed Cabbage': 'https://prevaclub.com/wp-content/uploads/2026/07/Steamed-Cabbage-768x615.jpg',
  'Red Wine Poached Pear': 'https://prevaclub.com/wp-content/uploads/2026/07/Red-Wine-Poached-Pear-768x615.jpg'
};

// Keeps the public menu useful while the admin database is being populated.
// As soon as the API contains items, the API data replaces this fallback.
const FALLBACK_MENU_ITEMS = [
  { category: 'Preva Wings', name: 'Preva Wings', price: '$16.50', description: "Preva's signature crispy jumbo wings, tossed in your choice of house sauce." },
  { category: 'Preva Wings', name: 'Preva Wings Chilli', price: '$16.50', description: 'Wings coated in sweet chili sauce with a mild, bright finish.' },
  { category: 'Preva Wings', name: 'Honey Hot', price: '$16.50', description: 'Crispy jumbo wings tossed in hot honey — sweet heat with a sticky glaze.' },
  { category: 'Preva Wings', name: 'Buffalo', price: '$16.50', description: 'Classic buffalo wings in tangy cayenne sauce, served with ranch.' },
  { category: 'Preva Wings', name: 'BBQ', price: '$16.50', description: 'Smoky barbecue wings, slow-glazed and finished on the grill.' },
  { category: 'Preva Wings', name: 'Garlic Parmesan', price: '$16.50', description: 'Wings tossed in garlic butter and finished with shaved parmesan.' },
  { category: 'Preva Wings', name: 'Lemon Pepper', price: '$16.50', description: 'Crisp wings seasoned with cracked black pepper and fresh lemon zest.' },
  { category: 'Preva Wings', name: 'Jerk', price: '$16.50', description: 'Caribbean jerk wings marinated in house spice and grilled hot.' },
  { category: 'Preva Burger', name: 'Preva Burger', price: 'Priced on ordering apps', description: "Preva's signature cheeseburger with American cheese, lettuce, tomato, red onion and pickles on a toasted bun." },
  { category: 'Preva Burger', name: 'Preva Double Smash Burger', price: '$11.49', description: 'Two smash patties, two slices of American cheese, thousand island, served with fries.' },
  { category: 'Quesadillas', name: 'Preva Quesadilla', price: '$17.49', description: 'Seasoned chicken and melted cheese grilled in a flour tortilla, served with sour cream and salsa.' },
  { category: 'Quesadillas', name: 'Steak Quesadilla', price: '$18.50', description: 'Grilled steak, melted cheese, peppers and onions, served with sour cream and salsa.' },
  { category: 'Quesadillas', name: 'Shrimp Quesadillas', price: '$18.50', description: 'Seasoned shrimp, melted cheese, peppers and onions, served with sour cream and salsa.' },
  { category: 'Quesadillas', name: 'Beef Quesadillas', price: '$16.50', description: 'Seasoned beef and melted cheese grilled in a flour tortilla, served with sour cream and salsa.' },
  { category: 'Quesadillas', name: 'Veggie Quesadilla', price: '$14.49', description: 'Grilled peppers, onions and melted cheese in a flour tortilla, served with sour cream and salsa.' },
  { category: 'Tacos', name: 'Shrimp Tacos', price: '$17.50', description: 'Seasoned shrimp tacos topped with fresh slaw and house sauce.' },
  { category: 'Tacos', name: 'Steak Tacos', price: '$17.50', description: 'Seasoned steak tacos topped with fresh slaw and house sauce.' },
  { category: 'Tacos', name: 'Chicken Tacos', price: '$16.50', description: 'Seasoned chicken tacos topped with fresh slaw and house sauce.' },
  { category: 'Preva Bites', name: 'Catfish Bites', price: '$15.50', description: 'Seasoned fried catfish bites served hot and crispy.' },
  { category: 'Preva Bites', name: 'Lobster Bites', price: '$21.50', description: 'Tender lobster bites fried golden and served with house sauce.' },
  { category: 'Preva Bites', name: 'Steak Bites', price: '$19.50', description: 'Seasoned steak bites grilled and finished with garlic butter.' },
  { category: 'Pasta', name: 'Veggie Pasta', price: '$16.50', description: 'Creamy pasta with sautéed peppers, onions and seasonal vegetables.' },
  { category: 'Pasta', name: 'Rasta Pasta', price: '$22.00', description: 'Creamy Caribbean-style pasta with bell peppers and house jerk seasoning. Choose your protein when you order.' },
  { category: 'Salads', name: 'House Salad', price: '$8.29', description: 'Crisp mixed greens with tomato, red onion and cucumber.' },
  { category: 'Entrées', name: 'Lamb Chops', price: '$33.50', description: 'Grilled lamb chops seasoned with Preva house spices and served with choice of sides.' },
  { category: 'Entrées', name: 'Catfish Bites with Fries', price: '$26.50', description: 'A full plate of seasoned catfish bites served with a side of fries.' },
  { category: 'Sides', name: 'Mac & Cheese', price: '$7.50', description: 'Baked macaroni in a blend of melted cheeses.' },
  { category: 'Sides', name: 'Collard Greens with Turkey Meat', price: '$7.50', description: 'Slow-simmered collard greens cooked with smoked turkey.' },
  { category: 'Sides', name: 'Yams', price: '$7.50', description: 'Candied yams baked soft in a brown sugar glaze.' },
  { category: 'Sides', name: 'Fries', price: '$6.50', description: 'Golden seasoned fries, fried crisp to order.' },
  { category: 'Sides', name: 'Rice & Peas', price: '$5.50', description: 'Caribbean rice simmered with kidney beans and coconut.' },
  { category: 'Sides', name: 'Fried Plantains', price: '$6.50', description: 'Sweet plantains fried golden and caramelized at the edges.' },
  { category: 'Sides', name: 'Steamed Cabbage', price: '$5.50', description: 'Lightly seasoned cabbage steamed until tender.' },
  { category: 'Dessert', name: 'Red Wine Poached Pear', price: '$11.50', description: 'Pear gently poached in spiced red wine.' }
];

function groupMenuItems(items) {
  const groupedMap = {};

  items.forEach((item) => {
    if (!groupedMap[item.category]) {
      groupedMap[item.category] = { title: item.category, items: [] };
    }

    groupedMap[item.category].items.push({
      title: item.name,
      slug: item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      price: item.price,
      description: item.description,
      image: item.image || MENU_ITEM_IMAGES[item.name] || ''
    });
  });

  return Object.values(groupedMap).sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a.title);
    const bIndex = CATEGORY_ORDER.indexOf(b.title);
    return (aIndex === -1 ? CATEGORY_ORDER.length : aIndex) -
      (bIndex === -1 ? CATEGORY_ORDER.length : bIndex);
  });
}

export default function PrevaKitchenMenu() {
  const [categoriesList, setCategoriesList] = useState(() => groupMenuItems(FALLBACK_MENU_ITEMS));
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`${API}/menu-items`);
        if (res.ok) {
          const items = await res.json();
          
          setCategoriesList(groupMenuItems(items.length > 0 ? items : FALLBACK_MENU_ITEMS));
        }
      } catch (err) {
        console.error('Error fetching menu items:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMenu();
  }, []);

  useEffect(() => {
    if (!selectedItem) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSelectedItem(null);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedItem]);

  const triggerOrderModal = (e) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && window.openOrderModal) {
      window.openOrderModal();
    }
  };

  // Align columns exactly like the live website
  const leftOrder = ['Preva Wings', 'Preva Burger', 'Quesadillas', 'Tacos', 'Preva Bites'];
  const leftColumnCategories = leftOrder
    .map(name => categoriesList.find(cat => cat.title === name))
    .filter(Boolean);

  const rightColumnCategories = categoriesList.filter(cat => !leftOrder.includes(cat.title));

  return (
    <>
      {/* Hero Section */}
      <section className="menu-hero" suppressHydrationWarning>
        <div className="menu-hero-overlay"></div>
        <div className="menu-hero-content">
          <h1>Menu</h1>
          <p>Crafted Flavors • Premium Dining • Signature Experience</p>
          <div className="preva-menu-order-cta preva-menu-order-cta--hero">
            <a
              href="#preva-order"
              className="preva-order-trigger preva-menu-order-button"
              aria-haspopup="dialog"
              aria-controls="prevaOrderModal"
              onClick={triggerOrderModal}
            >
              Order Online
            </a>
          </div>
        </div>
      </section>

      {/* Restaurant Menu */}
      <section className="restaurant-menu">
        <div className="menu-container">
          {loading ? (
            <div style={{ width: '100%', gridColumn: 'span 2' }}>
              <KitchenLoader text="Loading menu items..." />
            </div>
          ) : categoriesList.length === 0 ? (
            <div style={{ width: '100%', gridColumn: 'span 2', textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ color: '#8E8472' }}>The restaurant menu is temporarily unavailable. Please check back later.</p>
            </div>
          ) : (
            <>
              {/* Left Column */}
              <div className="menu-column">
                {leftColumnCategories.map((cat, idx) => (
                  <div key={idx} className="menu-category">
                    <h2 className="category-title">{cat.title}</h2>
                    {cat.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="menu-card"
                        role="button"
                        tabIndex={0}
                        aria-label={`View ${item.title} details`}
                        onClick={() => setSelectedItem(item)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedItem(item);
                          }
                        }}
                      >
                        <div className="menu-image">
                          {item.image ? (
                            <img src={item.image} alt={item.title} />
                          ) : (
                            <div
                              style={{
                                width: '100px',
                                height: '100px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#080808',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.03)',
                                fontSize: '0.8rem',
                                color: '#444'
                              }}
                            >
                              <SvgIcon name="utensils" size={30} />
                            </div>
                          )}
                        </div>
                        <div className="menu-content">
                          <div className="menu-top">
                            <h3>{item.title}</h3>
                            <div className="menu-line"></div>
                            <div className="menu-price">{item.price}</div>
                          </div>
                          {item.description && <p>{item.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Right Column */}
              <div className="menu-column">
                {rightColumnCategories.map((cat, idx) => (
                  <div key={idx} className="menu-category">
                    <h2 className="category-title">{cat.title}</h2>
                    {cat.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="menu-card"
                        role="button"
                        tabIndex={0}
                        aria-label={`View ${item.title} details`}
                        onClick={() => setSelectedItem(item)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedItem(item);
                          }
                        }}
                      >
                        <div className="menu-image">
                          {item.image ? (
                            <img src={item.image} alt={item.title} />
                          ) : (
                            <div
                              style={{
                                width: '100px',
                                height: '100px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#080808',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.03)',
                                fontSize: '0.8rem',
                                color: '#444'
                              }}
                            >
                              <SvgIcon name="utensils" size={30} />
                            </div>
                          )}
                        </div>
                        <div className="menu-content">
                          <div className="menu-top">
                            <h3>{item.title}</h3>
                            <div className="menu-line"></div>
                            <div className="menu-price">{item.price}</div>
                          </div>
                          {item.description && <p>{item.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Bottom Order CTA */}
      <section className="preva-menu-bottom-order">
        <div className="preva-menu-order-cta">
          <a
            href="#preva-order"
            className="preva-order-trigger preva-menu-order-button"
            aria-haspopup="dialog"
            aria-controls="prevaOrderModal"
            onClick={triggerOrderModal}
          >
            Order Online
          </a>
        </div>
      </section>

      {selectedItem && (
        <div
          className="dish-lightbox"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedItem(null);
          }}
        >
          <div
            className="dish-lightbox-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dish-lightbox-title"
          >
            <button
              type="button"
              className="dish-lightbox-close"
              aria-label="Close dish details"
              onClick={() => setSelectedItem(null)}
              autoFocus
            >
              &times;
            </button>

            <div className="dish-lightbox-image">
              {selectedItem.image ? (
                <img src={selectedItem.image} alt={selectedItem.title} />
              ) : (
                <div className="dish-lightbox-image-placeholder" aria-hidden="true">
                  PREVA
                </div>
              )}
            </div>

            <div className="dish-lightbox-content">
              <h2 id="dish-lightbox-title">{selectedItem.title}</h2>
              {selectedItem.description && <p>{selectedItem.description}</p>}
              <div className="dish-lightbox-price">{selectedItem.price}</div>
              <div style={{ marginTop: '22px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <a
                  href={`/preva-kitchen-menu/${encodeURIComponent(selectedItem.slug || selectedItem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`}
                  className="luxe-btn luxe-btn-gold"
                  style={{ height: '44px', padding: '0 22px', fontSize: '0.8rem' }}
                >
                  View Full Dish Page →
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    setSelectedItem(null);
                    triggerOrderModal(e);
                  }}
                  className="luxe-btn luxe-btn-glass"
                  style={{ height: '44px', padding: '0 22px', fontSize: '0.8rem' }}
                >
                  Order Online
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
