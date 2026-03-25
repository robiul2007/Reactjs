import React, { useState, useEffect } from 'react';
import './index.css';

const dummyProducts = [
  { id: '1', name: 'Cloud Knit Sweater', price: 1299, discount: 15, img: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&q=80&w=400' },
  { id: '2', name: 'Soft Linen Romper', price: 899, discount: 0, img: 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&q=80&w=400' },
  { id: '3', name: 'Pastel Cotton Tee', price: 599, discount: 20, img: 'https://images.unsplash.com/photo-1522771930-78848d92871d?auto=format&fit=crop&q=80&w=400' },
  { id: '4', name: 'Cozy Dream Pants', price: 999, discount: 0, img: 'https://images.unsplash.com/photo-1471286174890-9c112d1c9293?auto=format&fit=crop&q=80&w=400' }
];

export default function App() {
  const [currentView, setCurrentView] = useState('home'); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
  }, [isDarkMode]);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setCurrentView('product');
  };

  const addToCart = (product) => {
    const finalPrice = product.discount > 0 ? Math.round(product.price - (product.price * (product.discount/100))) : product.price;
    setCart([...cart, { ...product, finalPrice }]);
    // Simple custom toast alert
    const toast = document.createElement('div');
    toast.innerHTML = `<div style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:var(--text-main); color:white; padding:10px 20px; border-radius:20px; z-index:9999; font-size:12px;">Added to Bag! 🛍️</div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const removeFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const getCartTotal = () => cart.reduce((total, item) => total + item.finalPrice, 0);

  const handleMenuClick = (view) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
    window.scrollTo(0, 0);
  };

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (window.confetti) {
      window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#A9D4D9', '#F6D7D7'] });
    }
    alert("Order Confirmed! 🎈");
    setIsCheckoutOpen(false);
    setCart([]);
    setCurrentView('home');
  };
  return (
    <>
      <header>
        <div className="header-icons">
          <i className="icon-btn fas fa-bars" onClick={() => setIsSidebarOpen(true)}></i>
        </div>
        <div className="brand-logo brand-font" onClick={() => handleMenuClick('home')}>raizo.</div>
        <div className="header-icons">
          <i className={`icon-btn ${isDarkMode ? 'fas fa-sun' : 'fas fa-moon'}`} onClick={() => setIsDarkMode(!isDarkMode)}></i>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => handleMenuClick('cart')}>
            <i className="icon-btn fas fa-shopping-bag"></i>
            {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.3)', zIndex:1999}} onClick={() => setIsSidebarOpen(false)}></div>}
      
      {/* Sidebar Menu */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px'}}>
          <h2 className="brand-font">Menu</h2>
          <i className="fas fa-times" style={{fontSize:'20px', color:'var(--text-muted)', cursor:'pointer'}} onClick={() => setIsSidebarOpen(false)}></i>
        </div>
        <div className="sidebar-link" onClick={() => handleMenuClick('home')}><i className="fas fa-home" style={{color:'var(--primary)'}}></i> Shop Home</div>
        <div className="sidebar-link" onClick={() => handleMenuClick('cart')}><i className="fas fa-shopping-bag" style={{color:'var(--secondary)'}}></i> My Bag</div>
        <div className="sidebar-link" onClick={() => setIsCheckoutOpen(true)}><i className="far fa-user" style={{color:'var(--text-muted)'}}></i> Parents Profile</div>
      </div>

      {currentView === 'home' && (
        <div className="view-container">
          <div style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '30px 20px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
            <p style={{fontSize:'11px', letterSpacing:'2px', color:'var(--text-muted)', marginBottom:'10px', textTransform:'uppercase'}}>New Arrivals</p>
            <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>Soft & Playful.</h1>
            <button className="btn-main" style={{maxWidth:'200px'}} onClick={() => window.scrollTo(0, 300)}>Explore</button>
          </div>
          <h2 className="brand-font" style={{ textAlign: 'center', marginTop: '40px', fontSize:'22px' }}>Trending Outfits</h2>
          <div className="product-grid">
            {dummyProducts.map((p) => (
              <div key={p.id} className="product-card" onClick={() => handleProductClick(p)}>
                {p.discount > 0 && <span className="tag">{p.discount}% OFF</span>}
                <img src={p.img} alt={p.name} className="product-img" />
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '5px' }}>{p.name}</h3>
                  <p style={{fontWeight:'800', color:'var(--text-main)'}}>₹{p.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentView === 'product' && selectedProduct && (
        <div className="view-container product-detail-wrap">
          <div style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '15px', border: '1px solid var(--border-color)' }}>
            <img src={selectedProduct.img} alt={selectedProduct.name} style={{ width: '100%', borderRadius: '16px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '1px', textTransform:'uppercase' }}>SKU: RZ-{selectedProduct.id}00</p>
            <h1 style={{ fontSize: '28px', margin: '5px 0 10px' }}>{selectedProduct.name}</h1>
            <h2 style={{ color: 'var(--text-main)', fontSize: '24px', marginBottom: '15px' }}>₹{selectedProduct.price}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize:'14px', lineHeight: '1.6', marginBottom: '25px' }}>
              Crafted with ultra-soft, breathable materials. Perfect for sensitive skin and endless playtime adventures.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-outline" onClick={() => addToCart(selectedProduct)}>Add to Bag</button>
              <button className="btn-main" onClick={() => setIsCheckoutOpen(true)}>Buy Now</button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'cart' && (
        <div className="view-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 className="brand-font" style={{ textAlign: 'center', marginBottom: '20px' }}>Your Bag</h2>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'var(--card-bg)', borderRadius: '24px', border:'1px solid var(--border-color)' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Your bag is empty.</p>
              <button className="btn-main" onClick={() => handleMenuClick('home')}>Shop Now</button>
            </div>
          ) : (
            <div style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '20px', border: '1px solid var(--border-color)' }}>
              {cart.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '15px', marginBottom: '15px', borderBottom: '1px solid var(--border-color)' }}>
                  <img src={item.img} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }} alt={item.name} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '14px' }}>{item.name}</h4>
                    <p style={{ color: 'var(--text-main)', fontWeight: '800', fontSize:'15px' }}>₹{item.finalPrice}</p>
                  </div>
                  <i className="fas fa-times" style={{color:'var(--text-muted)', fontSize:'20px', cursor:'pointer'}} onClick={() => removeFromCart(index)}></i>
                </div>
              ))}
              <div style={{ textAlign: 'right', marginTop: '15px' }}>
                <h3 style={{ fontSize: '20px', marginBottom: '15px' }}>Total: ₹{getCartTotal()}</h3>
                <button className="btn-main" onClick={() => setIsCheckoutOpen(true)}>Proceed to Checkout</button>
              </div>
            </div>
          )}
        </div>
      )}

      {isCheckoutOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
              <h2 className="brand-font">Secure Checkout</h2>
              <i className="fas fa-times close-btn" style={{position:'static'}} onClick={() => setIsCheckoutOpen(false)}></i>
            </div>
            <form onSubmit={handleCheckoutSubmit}>
              <input type="text" placeholder="Parents Full Name" required />
              <input type="text" placeholder="Delivery Address" required />
              <input type="tel" placeholder="Phone Number" required />
              
              <div style={{ background: 'var(--bg-color)', padding: '15px', borderRadius: '16px', margin: '15px 0', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <span style={{ fontWeight: '800' }}>Total:</span>
                  <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '18px' }}>
                    ₹{currentView === 'product' ? (selectedProduct?.finalPrice || 0) : getCartTotal()}
                  </span>
                </div>
              </div>
              <button type="submit" className="btn-main">Confirm Order</button>
            </form>
          </div>
        </div>
      )}
      
      <div className="chat-fab-premium" onClick={() => alert("Live Chat is ready to be linked to your Firebase!")}><i className="fas fa-comment-dots"></i></div>
    </>
  );
}
