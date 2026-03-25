import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const DB_URL = "https://leon-41242-default-rtdb.firebaseio.com/";
const SLIDERS = ["slider1.jpg", "slider2.jpg", "slider3.jpg"];
const CATS = [
  { name: "Chiffon", img: "cat1.jpg" },
  { name: "Cotton", img: "cat2.jpg" },
  { name: "Abayas", img: "cat3.jpg" },
  { name: "Undercaps", img: "cat1.jpg" }
];

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('home-view');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentHomeSlide, setCurrentHomeSlide] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [toast, setToast] = useState({ show: false, msg: '', bg: '' });
  const [orders, setOrders] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState('single');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [upiScreenshot, setUpiScreenshot] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [checkoutDiscount, setCheckoutDiscount] = useState(0);
  const [dynamicUpiId, setDynamicUpiId] = useState("YOUR_UPI_ID@okaxis");
  const [loginName, setLoginName] = useState('');
  const [loginNumber, setLoginNumber] = useState('');

  const chatEndRef = useRef(null);
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  useEffect(() => {
    const isDark = localStorage.getItem('rsDarkModeMain') === 'true';
    setIsDarkMode(isDark);
    if(isDark) document.body.classList.add('dark-mode');

    const savedCart = localStorage.getItem('rsFashionCart');
    if(savedCart) setCart(JSON.parse(savedCart));

    const savedUser = localStorage.getItem('rsFashionUser');
    if(savedUser) setCurrentUser(JSON.parse(savedUser));

    fetch(DB_URL + 'settings.json').then(r=>r.json()).then(d=>{if(d && d.upiId) setDynamicUpiId(d.upiId);}).catch(()=>{});

    const fetchProducts = async () => {
      try {
        const res = await fetch(DB_URL + 'products.json'); const data = await res.json();
        if(data) setProducts(Object.keys(data).map(key => ({ id: key, ...data[key] })));
      } catch (e) {}
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (currentView === 'home-view') {
      const timer = setInterval(() => setCurrentHomeSlide((p) => (p + 1) % SLIDERS.length), 4000);
      return () => clearInterval(timer);
    }
  }, [currentView]);

  useEffect(() => {
    let poller;
    if (currentView === 'chat-view' && currentUser) {
      fetchUserMessages();
      poller = setInterval(fetchUserMessages, 5000);
    }
    return () => clearInterval(poller);
  }, [currentView, currentUser]);

  useEffect(() => {
    if(chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('rsDarkModeMain', !isDarkMode);
  };

  const showToast = (msg, type = 'success') => {
    const bg = type === 'error' ? '#f64e60' : '#1bc5bd';
    setToast({ show: true, msg, bg });
    setTimeout(() => setToast({ show: false, msg: '', bg: '' }), 3000);
  };

  const navigate = (viewId, product = null) => {
    if(product) {
      setSelectedProduct(product);
      setGalleryIndex(0);
      const finalPrice = product.discount > 0 ? Math.round(product.price - (product.price * (product.discount/100))) : product.price;
      product.finalPrice = finalPrice;
      setSuggestedProducts(products.filter(p => p.id !== product.id).sort(() => 0.5 - Math.random()).slice(0, 4));
    }
    setCurrentView(viewId);
    setIsSidebarOpen(false);
    setIsSearchOpen(false);
    window.scrollTo(0, 0);
    if(viewId === 'orders-view') fetchMyOrders();
  };

  const addToCart = (product) => {
    if(product.status === 'Out of Stock' || product.stock <= 0) return showToast("Sold Out!", "error");
    const finalPrice = product.discount > 0 ? Math.round(product.price - (product.price * (product.discount/100))) : product.price;
    const newCart = [...cart, { ...product, finalPrice }];
    setCart(newCart); localStorage.setItem('rsFashionCart', JSON.stringify(newCart));
    showToast("Added to cart!");
    if(currentUser?.dbKey) fetch(`${DB_URL}users/${currentUser.dbKey}.json`, { method: 'PATCH', body: JSON.stringify({ cart: newCart }) });
  };

  const removeFromCart = (index) => {
    const newCart = [...cart]; newCart.splice(index, 1);
    setCart(newCart); localStorage.setItem('rsFashionCart', JSON.stringify(newCart));
    if(currentUser?.dbKey) fetch(`${DB_URL}users/${currentUser.dbKey}.json`, { method: 'PATCH', body: JSON.stringify({ cart: newCart }) });
  };

  const getCartTotal = () => cart.reduce((t, item) => t + (item.finalPrice || item.price), 0);

  const processLogin = async (e) => {
    e.preventDefault();
    if(!loginName || !loginNumber) return showToast("Enter Name & Number", "error");
    try {
      const res = await fetch(DB_URL + 'users.json'); const data = await res.json();
      let existingUser = null; let existingKey = null;
      if(data) { for(let key in data) { if(data[key].phone === loginNumber) { existingUser = data[key]; existingKey = key; break; } } }
      
      if(existingUser && existingUser.banned) return alert("Account Suspended.");
      
      let userObj;
      if(existingUser) { userObj = { ...existingUser, dbKey: existingKey }; } 
      else {
        userObj = { name: loginName, phone: loginNumber, userId: `RS${Math.floor(10000 + Math.random() * 90000)}`, banned: false, cart: [] };
        const postRes = await fetch(DB_URL + 'users.json', { method: 'POST', body: JSON.stringify(userObj) });
        const postData = await postRes.json(); userObj.dbKey = postData.name;
      }
      
      if(userObj.cart && userObj.cart.length > 0 && cart.length === 0) { setCart(userObj.cart); localStorage.setItem('rsFashionCart', JSON.stringify(userObj.cart)); }
      setCurrentUser(userObj); localStorage.setItem('rsFashionUser', JSON.stringify(userObj));
      setIsLoginOpen(false); navigate('profile-view'); showToast("Logged in!");
    } catch (error) {}
  };

  const fetchMyOrders = async () => {
    if(!currentUser) return;
    try {
      const res = await fetch(DB_URL + 'orders.json'); const data = await res.json();
      if(data) setOrders(Object.keys(data).map(k => data[k]).filter(o => o.userId === currentUser.userId).reverse());
    } catch(e) {}
  };

  const fetchUserMessages = async () => {
    if(!currentUser || !currentUser.dbKey) return;
    try {
      let res = await fetch(`${DB_URL}chats/${currentUser.dbKey}/messages.json`); let msgs = await res.json();
      if(msgs) setChatMessages(Object.values(msgs));
    } catch(e) {}
  };

  const sendUserMessage = async () => {
    if(!currentUser || !currentUser.dbKey || !chatInput.trim()) return;
    const msgData = { sender: 'user', text: chatInput.trim(), timestamp: Date.now(), status: 'sent' };
    setChatInput(''); setChatMessages([...chatMessages, msgData]);
    try {
      await fetch(`${DB_URL}chats/${currentUser.dbKey}/userName.json`, { method: 'PUT', body: JSON.stringify(currentUser.name) });
      await fetch(`${DB_URL}chats/${currentUser.dbKey}/messages.json`, { method: 'POST', body: JSON.stringify(msgData) });
      fetchUserMessages();
    } catch(e) {}
  };
  const renderProductCard = (p) => {
    const soldOut = p.status === 'Out of Stock' || p.stock <= 0;
    const finalPrice = p.discount > 0 ? Math.round(p.price - (p.price * (p.discount/100))) : p.price;
    return (
      <div key={p.id} className="product-card" onClick={() => navigate('product-view', p)} style={{position:'relative', opacity: soldOut ? 0.6 : 1}}>
        {soldOut && <div style={{position:'absolute', top:'10px', left:'10px', background:'#1e1e2d', color:'white', padding:'4px 8px', fontSize:'11px', fontWeight:'bold', borderRadius:'4px', zIndex:2}}>Sold Out</div>}
        {p.discount > 0 && !soldOut && <div style={{position:'absolute', top:'10px', right:'10px', background:'#f64e60', color:'white', padding:'4px 8px', fontSize:'11px', fontWeight:'bold', borderRadius:'4px', zIndex:2}}>{p.discount}% OFF</div>}
        <div className="product-img-wrap"><img src={p.img} alt={p.name} style={{filter: soldOut ? 'grayscale(1)' : 'none'}}/></div>
        <div className="product-info">
          <h3 style={{fontSize:'14px', marginBottom:'5px'}}>{p.name}</h3>
          <p style={{color:'var(--accent-color)', fontWeight:'bold'}}>{p.discount > 0 ? <><span style={{textDecoration:'line-through', color:'#888', fontSize:'11px', marginRight:'5px'}}>₹{p.price}</span>₹{finalPrice}</> : `₹${p.price}`}</p>
        </div>
      </div>
    );
  };

  const filteredSearch = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <header>
        <div className="header-left">
          <div className="menu-icon" onClick={() => setIsSidebarOpen(true)}><i className="fas fa-bars"></i></div>
          <div className="brand-logo" onClick={() => navigate('home-view')}>RS FASHION</div>
        </div>
        <div className="header-right">
          <i className={isDarkMode ? 'fas fa-sun' : 'fas fa-moon'} id="theme-toggle" onClick={toggleTheme} style={{marginRight: '10px'}}></i>
          <i className="fas fa-search" onClick={() => setIsSearchOpen(!isSearchOpen)}></i>
          <i className="far fa-user" onClick={() => currentUser ? navigate('profile-view') : setIsLoginOpen(true)}></i>
          <div className="cart-icon-wrap" onClick={() => navigate('cart-view')}>
            <i className="fas fa-shopping-bag"></i>
            {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
          </div>
        </div>
      </header>

      {isSearchOpen && (
        <div className="search-container" style={{display:'block'}}>
          <input type="text" className="search-input" placeholder="Search for products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {searchQuery && filteredSearch.length > 0 && (
            <div className="search-suggestions" style={{display:'block'}}>
              {filteredSearch.map(p => (
                <div key={p.id} className="suggestion-item" onClick={() => {navigate('product-view', p); setSearchQuery(''); setIsSearchOpen(false);}}>
                  <img src={p.img} alt=""/><div><b>{p.name}</b><br/><span style={{color:'#c5a880', fontSize:'12px'}}>₹{p.price}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isSidebarOpen && <div className="sidebar-overlay" style={{display:'block'}} onClick={() => setIsSidebarOpen(false)}></div>}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header"><h3 style={{fontFamily: 'Playfair Display'}}>Menu</h3><i className="fas fa-times" style={{fontSize: '20px', cursor: 'pointer'}} onClick={() => setIsSidebarOpen(false)}></i></div>
        <div className="sidebar-links">
          <a href="#" onClick={() => {setIsSearchOpen(true); setIsSidebarOpen(false);}}><i className="fas fa-search"></i> Search</a>
          <a href="#" onClick={() => navigate('home-view')}><i className="fas fa-home"></i> Home</a>
          <a href="#" onClick={() => navigate('shop-view')}><i className="fas fa-tshirt"></i> All Products</a>
          <a href="#" onClick={() => navigate('cart-view')}><i className="fas fa-shopping-cart"></i> Cart</a>
          <a href="#" onClick={() => {if(currentUser) navigate('orders-view'); else setIsLoginOpen(true); setIsSidebarOpen(false);}}><i className="fas fa-box"></i> My Orders</a>
          <a href="#" onClick={() => {if(currentUser) navigate('profile-view'); else setIsLoginOpen(true); setIsSidebarOpen(false);}}><i className="fas fa-user"></i> My Profile</a>
          <a href="#" onClick={() => navigate('chat-view')}><i className="fas fa-headset"></i> Live Support</a>
          <a href="#" onClick={() => navigate('about-view')}><i className="fas fa-info-circle"></i> About Developer</a>
        </div>
        <div style={{padding: '20px', textAlign: 'center', fontSize: '14px'}}><p>{currentUser ? <><b style={{color:'var(--text-main)'}}>{currentUser.name}</b><br/><span style={{color:'var(--text-gray)'}}>ID: {currentUser.userId}</span></> : 'Not Logged In'}</p></div>
      </div>

      {currentView === 'home-view' && (
        <div className="view-section active-view">
          <div className="slider-container">
            <div className="slider-btn left" onClick={() => setCurrentHomeSlide(p => p === 0 ? SLIDERS.length - 1 : p - 1)}><i className="fas fa-chevron-left"></i></div>
            <div className="slider-btn right" onClick={() => setCurrentHomeSlide(p => (p + 1) % SLIDERS.length)}><i className="fas fa-chevron-right"></i></div>
            <div className="slider-wrapper" style={{transform: `translateX(-${currentHomeSlide * 100}%)`}}>
              {SLIDERS.map((img, i) => (<div key={i} className="slide" style={{backgroundImage: `url('${img}')`}}><div className="slide-content"><h1>{i===0?'Modest & Elegant':i===1?'Premium Quality':'New Collection'}</h1></div></div>))}
            </div>
          </div>
          <h2 className="section-title">Shop by Category</h2>
          <div className="categories">
            {CATS.map((c, i) => (<div key={i} className="category-item" onClick={() => {setSearchQuery(c.name); setIsSearchOpen(true);}}><img src={c.img} className="category-img" alt=""/><p style={{fontSize:'13px', marginTop:'8px'}}>{c.name}</p></div>))}
          </div>
          <h2 className="section-title">Trending Now</h2>
          <div className="products-grid">{products.slice(0,8).map(renderProductCard)}</div>
        </div>
      )}

      {currentView === 'shop-view' && (
        <div className="view-section active-view">
          <h2 className="section-title">All Products</h2>
          <div className="products-grid">{products.map(renderProductCard)}</div>
        </div>
      )}
      {currentView === 'product-view' && selectedProduct && (() => {
        const activeGallery = selectedProduct.gallery && selectedProduct.gallery.length > 0 ? selectedProduct.gallery : [selectedProduct.img];
        return (
          <div className="view-section active-view">
            <div className="product-detail-container">
              <div className="detail-img-box" style={{position: 'relative'}}>
                {activeGallery.length > 1 && <div className="gallery-arrow left" style={{display:'flex'}} onClick={() => setGalleryIndex(p => p === 0 ? activeGallery.length - 1 : p - 1)}><i className="fas fa-chevron-left"></i></div>}
                {activeGallery.length > 1 && <div className="gallery-arrow right" style={{display:'flex'}} onClick={() => setGalleryIndex(p => (p + 1) % activeGallery.length)}><i className="fas fa-chevron-right"></i></div>}
                <img src={activeGallery[galleryIndex]} alt="Product" />
              </div>
              <div className="detail-info-box">
                <p style={{color: 'var(--text-gray)', fontSize: '13px', marginBottom: '5px'}}>Product ID: {selectedProduct.id}</p>
                <h1 className="detail-title">{selectedProduct.name}</h1>
                <p className="detail-price">
                  {selectedProduct.discount > 0 ? <><span style={{textDecoration:'line-through', color:'#888', fontSize:'14px', marginRight:'8px'}}>₹{selectedProduct.price}</span>₹{selectedProduct.finalPrice} <span style={{color:'#f64e60', fontSize:'12px'}}>({selectedProduct.discount}% OFF)</span></> : `₹${selectedProduct.price}`}
                </p>
                <ul className="features">
                  <li><i className="fas fa-check-circle"></i> Premium Quality Fabric</li>
                  {selectedProduct.paymentMode === 'UPI Only' ? <li style={{color:'#d9534f'}}><i className="fas fa-exclamation-circle"></i> Prepaid / UPI Only (No COD)</li> : <li><i className="fas fa-check-circle"></i> Cash on Delivery Available</li>}
                </ul>
                <div className="btn-group">
                  <button className="btn-add" onClick={() => addToCart(selectedProduct)}>Add to Cart</button>
                  <button className="btn-buy" onClick={() => { if(!currentUser) return setIsLoginOpen(true); setCheckoutMode('single'); setAppliedCouponCode(''); setCheckoutDiscount(0); setIsCheckoutOpen(true); }}>Buy Now</button>
                </div>
                <button className="btn-share" onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Hey! Check out this beautiful ${selectedProduct.name} for just ₹${selectedProduct.finalPrice} at RS Fashion! 🛍️\n\n${window.location.href}`)}`)}><i className="fab fa-whatsapp"></i> Share with a Friend</button>
              </div>
            </div>
            <h2 className="section-title" style={{marginTop: '50px'}}>You May Also Like</h2>
            <div className="products-grid">{suggestedProducts.map(renderProductCard)}</div>
          </div>
        );
      })()}

      {currentView === 'cart-view' && (
        <div className="view-section active-view">
          <div className="cart-container">
            <h2 className="section-title">Your Cart</h2>
            {cart.length === 0 ? <p style={{textAlign:'center', color:'var(--text-gray)'}}>Cart is empty.</p> : (
              <>
                {cart.map((item, i) => (
                  <div key={i} className="cart-item"><img src={item.img} alt=""/><div><h4 style={{fontSize:'14px', margin:0, color:'var(--text-main)'}}>{item.name}</h4><p style={{fontWeight:'bold', color:'var(--accent-color)', margin:0}}>₹{item.finalPrice || item.price}</p></div><i className="fas fa-trash" style={{color:'#f64e60', marginLeft:'auto', cursor:'pointer'}} onClick={() => removeFromCart(i)}></i></div>
                ))}
                <div className="cart-total">Total: ₹{getCartTotal()}</div>
                <button className="order-all-btn" onClick={() => { if(!currentUser) return setIsLoginOpen(true); setCheckoutMode('cart'); setAppliedCouponCode(''); setCheckoutDiscount(0); setIsCheckoutOpen(true); }}><i className="fas fa-shopping-cart"></i> Checkout All Items</button>
              </>
            )}
          </div>
        </div>
      )}

      {currentView === 'orders-view' && (
        <div className="view-section active-view">
          <div className="about-container">
            <h2 className="section-title">My Orders</h2>
            <div style={{textAlign: 'left', marginTop: '15px'}}>
              {orders.length === 0 ? <p style={{textAlign:'center', color:'var(--text-gray)'}}>No orders found.</p> : orders.map((o, i) => {
                const color = o.status === 'Pending' ? '#ffa800' : (o.status === 'Rejected' ? '#f64e60' : '#1bc5bd');
                return (
                  <div key={i} style={{background:'var(--card-bg)', padding:'15px', borderRadius:'8px', marginBottom:'15px', borderLeft:`4px solid ${color}`, border:'1px solid var(--border-color)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><b style={{color:'var(--text-main)'}}>{o.items}</b><span style={{background:color, color:'white', padding:'4px 10px', borderRadius:'4px', fontSize:'11px', fontWeight:'bold'}}>{o.status}</span></div>
                    <p style={{fontSize:'13px', marginTop:'10px', fontWeight:'bold', color:'var(--text-main)'}}>🚚 {o.deliveryTime}</p>
                    <p style={{fontSize:'12px', color:'var(--text-gray)', marginTop:'5px'}}>Amount: ₹{o.totalAmount} <span style={{background: o.paymentType==='COD'?'#333':'#6528F7', color:'white', padding:'2px 6px', borderRadius:'4px', fontSize:'9px', marginLeft:'5px'}}>{o.paymentType}</span></p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {currentView === 'profile-view' && currentUser && (
        <div className="view-section active-view">
          <div className="about-container">
            <h2 className="section-title">My Profile</h2>
            <div className="dev-card" style={{textAlign: 'center'}}>
              <div style={{width: '80px', height: '80px', background: '#c5a880', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 15px'}}><i className="fas fa-user"></i></div>
              <h3>{currentUser.name}</h3><p style={{marginBottom: '15px', color:'var(--text-gray)'}}>User ID: <strong>{currentUser.userId}</strong></p>
              <div style={{textAlign: 'left', marginBottom: '20px'}}><p style={{color:'var(--text-main)'}}><strong><i className="fas fa-phone"></i> Mobile:</strong> {currentUser.phone}</p></div>
              <button onClick={() => navigate('orders-view')} style={{padding: '12px', background: 'var(--light-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%', fontWeight: 'bold', fontSize:'16px', marginBottom:'10px', cursor:'pointer'}}><i className="fas fa-box"></i> View Order History</button>
              <button onClick={() => {setCurrentUser(null); localStorage.removeItem('rsFashionUser'); navigate('home-view');}} style={{padding: '12px', background: '#d9534f', color: 'white', border: 'none', borderRadius: '8px', width: '100%', fontWeight: 'bold', fontSize:'16px', cursor:'pointer'}}>Logout</button>
            </div>
          </div>
        </div>
      )}
      {currentView === 'chat-view' && (
        <div className="view-section active-view">
          <div className="about-container">
            <div className="chat-container">
              <div className="chat-header-premium">
                <div style={{width:'45px', height:'45px', background:'#c5a880', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px'}}>🎧</div>
                <div><h3 style={{margin:0}}>Concierge Support</h3><p style={{margin:0, fontSize:'12px', color:'#ddd'}}>We usually reply instantly</p></div>
              </div>
              <div className="chat-messages-area" id="user-chat-box">
                {!currentUser ? (
                  <div style={{textAlign:'center', marginTop:'40px'}}><i className="fas fa-lock" style={{fontSize:'40px', color:'var(--text-gray)', marginBottom:'15px'}}></i><p style={{color:'var(--text-main)'}}>Please login to access live support.</p><button onClick={() => setIsLoginOpen(true)} style={{marginTop:'15px', padding:'10px 20px', background:'#c5a880', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>Login Now</button></div>
                ) : chatMessages.length === 0 ? (
                  <p style={{textAlign:'center', color:'var(--text-gray)', fontSize:'13px', marginTop:'20px'}}>Send a message to start chatting with us.</p>
                ) : chatMessages.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.sender === 'user' ? 'chat-user' : 'chat-admin'}`}>{m.text}</div>
                ))}
                <div ref={chatEndRef} />
              </div>
              {currentUser && (
                <div className="chat-input-box">
                  <input type="text" placeholder="Type your message..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
                  <button className="chat-send-btn" onClick={sendUserMessage}><i className="fas fa-paper-plane"></i></button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentView === 'about-view' && (
        <div className="view-section active-view">
          <div className="about-container">
            <h2 className="section-title">About Developer</h2>
            <div className="dev-card" style={{textAlign: 'center'}}>
              <img src="robiul.png" alt="Robiul Islam" style={{width:'100px', height:'100px', borderRadius:'50%', objectFit:'cover', border:'3px solid #c5a880'}} />
              <h3 style={{marginTop: '15px'}}>Hi, my name is Robiul Islam</h3>
              <p style={{color:'var(--text-gray)', marginTop:'10px'}}>I made this elegant website to help businesses grow their online presence smoothly.</p>
              <div style={{textAlign: 'left', marginTop:'20px', background:'var(--light-bg)', padding:'15px', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
                <p style={{color:'var(--text-main)'}}><strong><i className="fas fa-envelope" style={{color:'#c5a880'}}></i> Email:</strong> robiulislam786786u@gmail.com</p>
              </div>
              <button onClick={() => window.location.href='mailto:robiulislam786786u@gmail.com'} style={{marginTop:'15px', padding:'10px 20px', background:'#c5a880', color:'white', border:'none', borderRadius:'5px', fontWeight:'bold', cursor:'pointer'}}>Contact Me</button>
            </div>
          </div>
        </div>
      )}

      {isLoginOpen && (
        <div className="modal" style={{display:'flex'}}>
          <div className="modal-content">
            <span className="close-modal" onClick={() => setIsLoginOpen(false)}>&times;</span>
            <h2 style={{fontFamily: 'Playfair Display', marginBottom: '20px'}}>Login</h2>
            <form onSubmit={processLogin}>
              <input type="text" placeholder="Full Name" value={loginName} onChange={e=>setLoginName(e.target.value)} required />
              <input type="tel" placeholder="Mobile Number" value={loginNumber} onChange={e=>setLoginNumber(e.target.value)} required />
              <button type="submit" style={{width: '100%', padding: '12px', background: '#1e1e2d', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor:'pointer'}}>Login / Create Account</button>
            </form>
          </div>
        </div>
      )}
      
      {isCheckoutOpen && (() => {
        const orderItems = checkoutMode === 'single' ? [selectedProduct] : cart;
        const isUpiOnly = orderItems.some(i => i.paymentMode === 'UPI Only');
        const baseTotal = orderItems.reduce((s, i) => s + (i.finalPrice || i.price), 0);
        const finalCheckoutTotal = baseTotal - checkoutDiscount;
        const upiLinkStr = `upi://pay?pa=${dynamicUpiId}&pn=RS%20Fashion&am=${finalCheckoutTotal}&cu=INR`;
        
        const handleApplyCoupon = (e) => {
          let code = appliedCouponCode.trim().toUpperCase(); if(!code) return;
          let discountFound = 0;
          orderItems.forEach(item => { if(item.coupon && item.coupon.toUpperCase() === code) { discountFound += Math.round(item.price * (item.discount / 100)); } });
          if(discountFound > 0) { setCheckoutDiscount(discountFound); showToast("🎉 Coupon Applied!", "success"); } 
          else { showToast("❌ Invalid Coupon", "error"); setCheckoutDiscount(0); }
        };

        const handleCheckoutSubmit = async (e) => {
          e.preventDefault();
          if (paymentMethod === "UPI" && !upiScreenshot) return showToast("Screenshot required for UPI!", "error");
          
          let itemsString = checkoutMode === 'single' ? selectedProduct.name : cart.map(i => i.name).join(", ");
          if(checkoutDiscount > 0) { itemsString += ` [Coupon Used: ${appliedCouponCode}]`; }

          const orderData = {
            userId: currentUser.userId, customerName: currentUser.name, phone: currentUser.phone,
            address: `${e.target.add1.value}, ${e.target.add2.value} - Pin: ${e.target.pin.value}`,
            items: itemsString, totalAmount: finalCheckoutTotal, status: "Pending", deliveryTime: "Awaiting Admin Confirmation",
            paymentType: paymentMethod, upiScreenshot: upiScreenshot
          };
          try {
            await fetch(DB_URL + 'orders.json', { method: 'POST', body: JSON.stringify(orderData) }); 
            setIsCheckoutOpen(false); setUpiScreenshot(''); setAppliedCouponCode(''); setCheckoutDiscount(0);
            if(checkoutMode === 'cart') { setCart([]); localStorage.setItem('rsFashionCart', JSON.stringify([])); }
            showToast("🎉 Order Placed!", "success"); setTimeout(() => navigate('orders-view'), 1500);
          } catch (err) { showToast("Failed to place order.", "error"); }
        };

        return (
          <div className="modal" style={{display:'flex'}}>
            <div className="modal-content" style={{maxHeight: '90vh', overflowY: 'auto'}}>
              <span className="close-modal" onClick={() => setIsCheckoutOpen(false)}>&times;</span>
              <h2 style={{fontFamily: 'Playfair Display', marginBottom: '15px'}}>Complete Order</h2>
              <form onSubmit={handleCheckoutSubmit}>
                <p style={{fontSize: '13px', fontWeight: 'bold', marginBottom: '5px'}}>Shipping Details</p>
                <input type="text" value={currentUser.name} required readOnly style={{opacity:0.7}} />
                <input type="tel" value={currentUser.phone} required readOnly style={{opacity:0.7}} />
                <input name="add1" type="text" placeholder="Address Line 1" required />
                <input name="add2" type="text" placeholder="Landmark" />
                <input name="pin" type="text" placeholder="Pincode" required />
                
                <div style={{marginBottom: '15px', display: 'flex', gap: '10px'}}>
                  <input type="text" placeholder="Coupon Code" value={appliedCouponCode} onChange={e=>setAppliedCouponCode(e.target.value)} style={{flex:1, marginBottom:0}} />
                  <button type="button" onClick={handleApplyCoupon} style={{padding: '12px 20px', background: '#c5a880', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor:'pointer'}}>Apply</button>
                </div>
                
                <div style={{marginBottom: '15px', fontSize: '14px', fontWeight: 'bold', textAlign: 'right', background: 'var(--light-bg)', padding:'10px', borderRadius:'5px'}}>
                  Subtotal: ₹{baseTotal}<br/>
                  {checkoutDiscount > 0 && <span style={{color: '#1bc5bd'}}>Coupon Discount: -₹{checkoutDiscount}<br/></span>}
                  Total to Pay: ₹<span style={{color:'#f64e60', fontSize:'16px'}}>{finalCheckoutTotal}</span>
                </div>
                
                <div style={{marginBottom: '20px'}}>
                  <p style={{fontWeight: 'bold', marginBottom: '10px', fontSize: '14px'}}><i className="fas fa-wallet"></i> Select Payment:</p>
                  {!isUpiOnly && (
                    <label className={`payment-card ${paymentMethod==='COD'?'selected':''}`} onClick={() => setPaymentMethod('COD')}>
                      <div><h4>Cash on Delivery</h4></div><i className="fas fa-check-circle" style={{color: paymentMethod==='COD'?'#c5a880':'#ddd'}}></i>
                    </label>
                  )}
                  <label className={`payment-card ${paymentMethod==='UPI'?'selected':''}`} onClick={() => setPaymentMethod('UPI')}>
                    <div><h4>Pay Online (UPI)</h4></div><i className="fas fa-check-circle" style={{color: paymentMethod==='UPI'?'#c5a880':'#ddd'}}></i>
                  </label>

                  {paymentMethod === 'UPI' && (
                    <div style={{marginTop: '15px', padding: '15px', border: '1px dashed #c5a880', borderRadius: '8px', textAlign: 'center'}}>
                      <p style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '10px'}}>Step 1: Pay ₹{finalCheckoutTotal}</p>
                      {isMobileDevice ? (
                        <a href={upiLinkStr} target="_blank" rel="noreferrer" style={{display: 'block', padding: '12px', background: '#6528F7', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', marginBottom: '15px'}}>Open UPI App</a>
                      ) : (
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLinkStr)}`} style={{margin: '0 auto 15px auto', width: '150px', height: '150px', borderRadius: '8px', border: '2px solid var(--border-color)'}} alt="Scan to Pay" />
                      )}
                      <p style={{fontSize: '14px', fontWeight: 'bold', color: '#d9534f', marginBottom: '10px'}}>Step 2: Upload Proof</p>
                      <label style={{display: 'block', padding: '15px', border: '1px dashed var(--border-color)', borderRadius: '8px', cursor: 'pointer'}}>
                        <span>{upiScreenshot ? "Screenshot Attached! ✅" : "Tap to attach screenshot"}</span>
                        <input type="file" accept="image/*" style={{display: 'none'}} onChange={(e) => {
                          const file = e.target.files[0]; if(file) { const reader = new FileReader(); reader.onload = (ev) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const scale = 400 / img.width; canvas.width = 400; canvas.height = img.height * scale; canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); setUpiScreenshot(canvas.toDataURL('image/jpeg', 0.6)); }; img.src = ev.target.result; }; reader.readAsDataURL(file); }
                        }} />
                      </label>
                      {upiScreenshot && <img src={upiScreenshot} style={{width: '100%', maxWidth: '200px', marginTop: '15px', borderRadius: '8px'}} alt=""/>}
                    </div>
                  )}
                </div>
                <button type="submit" style={{width: '100%', padding: '16px', background: '#c5a880', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor:'pointer'}}>Confirm Order</button>
              </form>
            </div>
          </div>
        );
      })()}

      <div className={`toast-notification ${toast.show ? 'show' : ''}`} style={{background: toast.bg}}>{toast.msg}</div>
      <footer>
        <h2 style={{fontFamily: 'Playfair Display', marginBottom: '10px'}}>RS FASHION</h2>
        <p style={{fontSize: '14px', marginBottom: '20px'}}>Premium modest wear shipped directly to you.</p>
        <div className="footer-social-box">
          <a href="https://youtube.com/@r.s_saru_vlog?si=G0fs6vu89ByI4r6C" target="_blank" rel="noreferrer" className="social-btn yt"><i className="fab fa-youtube"></i> Subscribe on YouTube</a>
          <a href="https://www.instagram.com/rs__fashion____009?igsh=d3JtYnpoMmZ5a3Ri" target="_blank" rel="noreferrer" className="social-btn ig"><i className="fab fa-instagram"></i> Follow on Instagram</a>
        </div>
        <p style={{fontSize: '12px', color: '#aaa', marginTop: '20px'}}>© 2026 RS Fashion. Developed by Robiul Islam.</p>
      </footer>
    </>
  );
}
