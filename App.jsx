import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';

const DB_URL = "https://leon-41242-default-rtdb.firebaseio.com/";
const heroImages = [
  "https://images.unsplash.com/photo-1550614000-4b95d4ed1b16?auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1589465885857-44edb59bbff2?auto=format&fit=crop&q=80"
];

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('home'); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [orders, setOrders] = useState([]);
  const [checkoutMode, setCheckoutMode] = useState('single');
  
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [upiScreenshot, setUpiScreenshot] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [readNotifs, setReadNotifs] = useState([]);

  // Live Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'user', text: 'Hi', time: '01:12' },
    { id: 2, sender: 'user', text: 'Hi', time: '11:23' },
    { id: 3, sender: 'admin', text: 'Hello, how can we help you today?', time: '11:26' }
  ]);

  useEffect(() => {
    const isDark = localStorage.getItem('rsDarkModeMain') === 'true';
    setIsDarkMode(isDark);
    if(isDark) document.body.classList.add('dark-mode');

    const savedUser = localStorage.getItem('rsFashionUser');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    const savedCart = localStorage.getItem('rsFashionCart');
    if (savedCart) setCart(JSON.parse(savedCart));
    const savedReads = localStorage.getItem('rsReadNotifs');
    if (savedReads) setReadNotifs(JSON.parse(savedReads));

    const fetchDB = async () => {
      try {
        const res = await fetch(DB_URL + 'products.json');
        const data = await res.json();
        if(data) setProducts(Object.keys(data).map(k => ({ id: k, ...data[k] })));

        const notifRes = await fetch(DB_URL + 'notifications.json');
        const notifData = await notifRes.json();
        if(notifData) { setNotifications(Object.keys(notifData).map(k => ({ id: k, ...notifData[k] })).reverse()); } 
        else { setNotifications([{ id: 'n1', title: '🎁 Welcome to RS Fashion!', message: 'Use coupon RAIZO10 to get ₹100 off!', date: 'System', icon: 'fas fa-gift' }]); }
      } catch (e) { console.error(e); }
    };
    fetchDB();
  }, []);

  useEffect(() => {
    if (currentView === 'home') {
      const timer = setInterval(() => setCurrentSlide((p) => (p + 1) % heroImages.length), 4000);
      return () => clearInterval(timer);
    }
  }, [currentView]);
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('rsDarkModeMain', !isDarkMode);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: '' }), 3000);
  };

  const navigate = (view, product = null) => {
    setSelectedProduct(product);
    setCurrentView(view);
    setIsSidebarOpen(false);
    window.scrollTo(0, 0);
    if(view === 'profile') fetchMyOrders();
  };

  const handleSearchIconClick = () => {
    navigate('shop');
    setTimeout(() => document.getElementById('main-search-input')?.focus(), 100);
  };

  const unreadCount = notifications.filter(n => !readNotifs.includes(n.id)).length;
  const handleOpenNotifs = () => {
    setIsNotifOpen(true);
    const allIds = notifications.map(n => n.id);
    setReadNotifs(allIds);
    localStorage.setItem('rsReadNotifs', JSON.stringify(allIds));
  };

  const addToCart = (product) => {
    if(product.status === 'Out of Stock' || product.stock <= 0) return showToast("⚠️ Sorry, Sold Out!", "error");
    const finalPrice = product.discount > 0 ? Math.round(product.price - (product.price * (product.discount/100))) : product.price;
    const newCart = [...cart, { ...product, finalPrice }];
    setCart(newCart);
    localStorage.setItem('rsFashionCart', JSON.stringify(newCart));
    showToast("🛍️ Awesome! Item added to cart!", "success");
    if(currentUser?.dbKey) fetch(`${DB_URL}users/${currentUser.dbKey}.json`, { method: 'PATCH', body: JSON.stringify({ cart: newCart }) });
  };

  const removeFromCart = (index) => {
    const newCart = [...cart]; newCart.splice(index, 1);
    setCart(newCart); localStorage.setItem('rsFashionCart', JSON.stringify(newCart));
    showToast("🗑️ Item removed", "info");
  };

  const getCartTotal = () => cart.reduce((t, item) => t + parseInt(item.finalPrice || item.price), 0);
  const getFinalTotal = () => Math.max(0, (checkoutMode === 'single' ? (selectedProduct.finalPrice || selectedProduct.price) : getCartTotal()) - discountAmount);

  const getStatusColor = (status) => {
    const s = status.toLowerCase();
    if(s.includes('pending')) return 'var(--warning)';
    if(s.includes('reject') || s.includes('cancel')) return 'var(--error)';
    return 'var(--success)';
  };

  const fetchMyOrders = async () => {
    if(!currentUser) return;
    try {
      const res = await fetch(DB_URL + 'orders.json'); const data = await res.json();
      if(data) setOrders(Object.keys(data).map(k => data[k]).filter(o => o.userId === currentUser.userId).reverse());
    } catch(e) {}
  };
  const processLogin = async (e) => {
    e.preventDefault();
    const name = e.target.name.value; const phone = e.target.phone.value;
    try {
      const res = await fetch(DB_URL + 'users.json'); const data = await res.json();
      let existingUser = null; let existingKey = null;
      if(data) { Object.keys(data).forEach(k => { if(data[k].phone === phone) { existingUser = data[k]; existingKey = k; } }); }
      
      let userObj;
      if(existingUser) { userObj = existingUser; userObj.dbKey = existingKey; } 
      else {
        userObj = { name, phone, userId: `RS${Math.floor(10000+Math.random()*90000)}`, cart: [] };
        const postRes = await fetch(DB_URL + 'users.json', { method: 'POST', body: JSON.stringify(userObj) });
        const postData = await postRes.json(); userObj.dbKey = postData.name;
      }
      setCurrentUser(userObj); localStorage.setItem('rsFashionUser', JSON.stringify(userObj));
      setIsLoginOpen(false); navigate('profile'); showToast("🎉 Welcome back! Logged in.", "success");
    } catch(e) { showToast("⚠️ Network Error", "error"); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas'); const scale = 400 / img.width;
          canvas.width = 400; canvas.height = img.height * scale;
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          setUpiScreenshot(canvas.toDataURL('image/jpeg', 0.6));
          showToast("📸 Screenshot Attached!", "info");
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === 'RAIZO10') { setDiscountAmount(100); showToast("🎁 Coupon Applied! You saved ₹100", "success"); } 
    else { showToast("❌ Invalid Coupon Code", "error"); }
  };

  const processCheckout = async (e) => {
    e.preventDefault();
    if (paymentMethod === 'UPI' && !upiScreenshot) return showToast("⚠️ Upload payment screenshot!", "error");
    
    const orderData = {
      userId: currentUser.userId, customerName: currentUser.name, phone: currentUser.phone,
      address: `${e.target.add1.value}, ${e.target.add2.value} - Pincode: ${e.target.pin.value}`,
      items: checkoutMode === 'single' ? selectedProduct.name : cart.map(i=>i.name).join(", "),
      totalAmount: getFinalTotal(), status: "Pending", deliveryTime: "Awaiting Confirmation", 
      paymentType: paymentMethod, upiScreenshot: upiScreenshot
    };
    try {
      await fetch(DB_URL + 'orders.json', { method: 'POST', body: JSON.stringify(orderData) });
      setIsCheckoutOpen(false); setUpiScreenshot(''); setDiscountAmount(0); setCouponCode('');
      if(checkoutMode === 'cart') { setCart([]); localStorage.setItem('rsFashionCart', JSON.stringify([])); }
      if (window.confetti) window.confetti({ particleCount: 150, spread: 80 });
      showToast("🚀 Order Placed Successfully!", "success"); navigate('profile');
    } catch(e) { showToast("❌ Failed to place order.", "error"); }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if(!chatInput.trim()) return;
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    setChatMessages([...chatMessages, { id: Date.now(), sender: 'user', text: chatInput, time }]);
    setChatInput('');
    setTimeout(() => {
      setChatMessages(prev => [...prev, { id: Date.now()+1, sender: 'admin', text: 'An agent will be with you shortly.', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    }, 1500);
  };
  const renderProductCard = (p) => {
    const soldOut = p.status === 'Out of Stock' || p.stock <= 0;
    const finalPrice = p.discount > 0 ? Math.round(p.price - (p.price * (p.discount/100))) : p.price;
    return (
      <div key={p.id} className="product-card" onClick={() => navigate('product', { ...p, finalPrice })}>
        {soldOut && <div style={{position:'absolute', top:'10px', left:'10px', background:'#1e1e2d', color:'white', padding:'4px 8px', fontSize:'11px', fontWeight:'bold', borderRadius:'4px', zIndex:2}}>Sold Out</div>}
        {p.discount > 0 && !soldOut && <div style={{position:'absolute', top:'10px', right:'10px', background:'var(--error)', color:'white', padding:'4px 8px', fontSize:'11px', fontWeight:'bold', borderRadius:'4px', zIndex:2}}>{p.discount}% OFF</div>}
        <div className="product-img-wrap"><img src={p.img} style={{filter: soldOut ? 'grayscale(1)' : 'none'}} alt={p.name}/></div>
        <div className="product-info"><h3 className="p-title">{p.name}</h3><p className="p-price">{p.discount > 0 ? <span style={{textDecoration:'line-through', color:'var(--text-muted)', fontSize:'11px', marginRight:'5px'}}>₹{p.price}</span> : ''}₹{finalPrice}</p></div>
      </div>
    );
  };

  return (
    <>
      <header>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}><div className="icon-btn" onClick={() => setIsSidebarOpen(true)}><i className="fas fa-bars"></i></div><div className="brand-logo" onClick={() => navigate('home')}>RS FASHION</div></div>
        <div className="header-icons">
          <div className="icon-btn" style={{position:'relative'}} onClick={handleOpenNotifs}><i className={`fas fa-bell ${unreadCount > 0 ? 'shake-anim' : ''}`}></i>{unreadCount > 0 && <span className="cart-badge">{unreadCount}</span>}</div>
          <i className={isDarkMode ? 'fas fa-sun icon-btn' : 'fas fa-moon icon-btn'} onClick={toggleTheme}></i> 
          <i className="fas fa-search icon-btn" onClick={handleSearchIconClick}></i> 
          <i className="far fa-user icon-btn" onClick={() => currentUser ? navigate('profile') : setIsLoginOpen(true)}></i> 
          <div className="icon-btn" style={{position:'relative'}} onClick={() => navigate('cart')}><i className="fas fa-shopping-bag"></i>{cart.length > 0 && <span className="cart-badge">{cart.length}</span>}</div>
        </div>
      </header>

      {isSidebarOpen && <div className="sidebar-overlay" style={{display:'block'}} onClick={() => setIsSidebarOpen(false)}></div>}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header"><h3 className="brand-font">Menu</h3><i className="fas fa-times" style={{fontSize:'20px', cursor:'pointer', color:'var(--text-muted)'}} onClick={() => setIsSidebarOpen(false)}></i></div>
        <div className="sidebar-links">
          <div onClick={handleSearchIconClick}><i className="fas fa-search" style={{width:'20px'}}></i> Search</div>
          <div onClick={() => navigate('home')}><i className="fas fa-home" style={{width:'20px'}}></i> Home</div>
          <div onClick={() => navigate('shop')}><i className="fas fa-tshirt" style={{width:'20px'}}></i> All Products</div>
          <div onClick={() => navigate('cart')}><i className="fas fa-shopping-cart" style={{width:'20px'}}></i> Cart</div>
          <div onClick={() => currentUser ? navigate('profile') : setIsLoginOpen(true)}><i className="fas fa-user" style={{width:'20px'}}></i> My Profile</div>
          <div onClick={() => navigate('chat')}><i className="fas fa-headphones-alt" style={{width:'20px', color:'var(--accent)'}}></i> Live Support</div>
          <div onClick={() => window.location.href='mailto:robiulislam786786u@gmail.com'}><i className="fas fa-envelope" style={{width:'20px'}}></i> Contact Us</div>
          <div onClick={() => {setIsSidebarOpen(false); navigate('about');}}><i className="fas fa-code" style={{width:'20px'}}></i> About Developer</div>
        </div>
        <div style={{padding: '20px', fontSize: '12px', borderTop:'1px solid var(--border-color)'}}>{currentUser ? <><span style={{color:'var(--text-muted)'}}>Logged in as </span><b>{currentUser.name}</b><br/>ID: {currentUser.userId}</> : 'Not Logged In'}</div>
      </div>

      <div style={{minHeight: '80vh'}}>
        {currentView === 'home' && (
          <motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}} style={{paddingTop: 0}}>
            <div className="hero-slider">{heroImages.map((img, i) => (<div key={i} className={`hero-slide ${i === currentSlide ? 'active' : ''}`} style={{backgroundImage: `url(${img})`}}><div className="hero-text"><h1 style={{fontSize:'36px', marginBottom:'15px'}}>{i === 0 ? 'Modest & Elegant' : 'Premium Quality'}</h1></div></div>))}</div>
            <h2 className="section-title">Shop by Category</h2>
            <div className="categories">
              <div className="category-item" onClick={() => navigate('shop')}><img src="https://images.unsplash.com/photo-1589465885857-44edb59bbff2?auto=format&fit=crop&q=80&w=150" className="category-img" alt="Chiffon"/><p className="category-name">Chiffon</p></div>
              <div className="category-item" onClick={() => navigate('shop')}><img src="https://images.unsplash.com/photo-1550614000-4b95d4ed1b16?auto=format&fit=crop&q=80&w=150" className="category-img" alt="Cotton"/><p className="category-name">Cotton</p></div>
              <div className="category-item" onClick={() => navigate('shop')}><img src="https://images.unsplash.com/photo-1607581561706-0346a060e7dc?auto=format&fit=crop&q=80&w=150" className="category-img" alt="Abayas"/><p className="category-name">Abayas</p></div>
              <div className="category-item" onClick={() => navigate('shop')}><img src="https://images.unsplash.com/photo-1589465885857-44edb59bbff2?auto=format&fit=crop&q=80&w=150" className="category-img" alt="Undercaps"/><p className="category-name">Undercaps</p></div>
            </div>
            <h2 className="section-title">Trending Now</h2><div className="products-grid">{products.slice(0,8).map(renderProductCard)}</div>
          </motion.div>
        )}

        {currentView === 'shop' && (
          <motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}}>
            <h2 className="section-title">All Products</h2>
            <div style={{padding: '0 5%'}}><input id="main-search-input" type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{width:'100%', padding:'12px', borderRadius:'5px', border:'1px solid var(--border-color)', marginBottom:'20px', background:'var(--card-bg)', color:'var(--text-main)', fontFamily:'Jost'}} /></div>
            <div className="products-grid">{products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(renderProductCard)}</div>
          </motion.div>
        )}

        {currentView === 'product' && selectedProduct && (
          <motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}}>
            <div className="product-detail-container">
              <div className="detail-img-box"><img src={selectedProduct.img} alt={selectedProduct.name} /></div>
              <div className="detail-info-box">
                <p style={{color:'var(--text-muted)', fontSize:'13px', marginBottom:'5px'}}>Product ID: {selectedProduct.id}</p>
                <h1 className="detail-title">{selectedProduct.name}</h1><p className="detail-price">₹{selectedProduct.finalPrice}</p>
                <ul style={{listStyle:'none', marginBottom:'20px', fontSize:'14px', color:'var(--text-muted)'}}><li style={{marginBottom:'8px'}}><i className="fas fa-check-circle" style={{color:'var(--success)', marginRight:'8px'}}></i>Premium Quality Fabric</li><li style={{marginBottom:'8px'}}><i className="fas fa-check-circle" style={{color:'var(--success)', marginRight:'8px'}}></i>Cash on Delivery Available</li></ul>
                <div className="btn-group"><button className="btn-add" onClick={() => addToCart(selectedProduct)}>Add to Cart</button><button className="btn-buy" onClick={() => { if(!currentUser) return setIsLoginOpen(true); setCheckoutMode('single'); setIsCheckoutOpen(true); }}>Buy Now</button></div>
              </div>
            </div>
            <div style={{marginTop:'50px', borderTop:'1px solid var(--border-color)'}}><h2 className="section-title">You May Also Like</h2><div className="products-grid">{products.filter(p => p.id !== selectedProduct.id).sort(()=>0.5-Math.random()).slice(0,4).map(renderProductCard)}</div></div>
          </motion.div>
        )}

        {currentView === 'cart' && (
          <motion.div className="view-container" style={{maxWidth:'800px', margin:'0 auto'}} initial={{opacity:0}} animate={{opacity:1}}>
            <h2 className="section-title">Your Cart</h2>
            {cart.length === 0 ? <p style={{textAlign:'center'}}>Cart is empty.</p> : (
              <>{cart.map((item, i) => (<div key={i} style={{display:'flex', alignItems:'center', gap:'15px', padding:'15px', borderBottom:'1px solid var(--border-color)'}}><img src={item.img} style={{width:'80px', height:'80px', objectFit:'cover', borderRadius:'5px'}} alt={item.name}/><div style={{flex:1}}><h4 style={{fontSize:'15px', fontWeight:'500'}}>{item.name}</h4><p style={{fontWeight:'bold', color:'var(--accent)'}}>₹{item.finalPrice}</p></div><i className="fas fa-trash" style={{color:'var(--error)', cursor:'pointer', fontSize:'18px'}} onClick={() => removeFromCart(i)}></i></div>))}
                <div style={{textAlign:'right', fontSize:'20px', fontWeight:'bold', margin:'20px 0'}}>Total: ₹{getCartTotal()}</div><button className="btn-buy" style={{width: '100%', padding: '15px'}} onClick={() => { if(!currentUser) return setIsLoginOpen(true); setCheckoutMode('cart'); setIsCheckoutOpen(true); }}><i className="fas fa-shopping-cart"></i> Checkout All Items</button>
              </>
            )}
          </motion.div>
        )}

        {currentView === 'profile' && currentUser && (
          <motion.div className="view-container" style={{maxWidth:'800px', margin:'0 auto'}} initial={{opacity:0}} animate={{opacity:1}}>
            <h2 className="section-title">My Profile</h2>
            <div className="dev-card" style={{textAlign:'center'}}>
              <div style={{width:'80px', height:'80px', background:'var(--accent)', color:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', margin:'0 auto 15px'}}><i className="fas fa-user"></i></div>
              <h3>{currentUser.name}</h3><p style={{color:'var(--text-muted)', fontSize:'12px'}}>User ID: <strong>{currentUser.userId}</strong></p>
              <div style={{marginTop:'25px', textAlign:'left'}}>
                <h3 style={{fontSize:'18px', borderBottom:'1px solid var(--border-color)', paddingBottom:'10px', marginBottom:'15px'}}>My Orders</h3>
                {orders.length === 0 ? <p>No orders yet.</p> : orders.map((o, i) => (
                  <div key={i} style={{background:'var(--card-bg)', padding:'15px', borderRadius:'8px', marginBottom:'15px', border:'1px solid var(--border-color)', borderLeft: `4px solid ${getStatusColor(o.status)}`}}>
                    <div style={{display:'flex', justifyContent:'space-between'}}><b style={{fontSize:'14px'}}>{o.items}</b><span style={{background: getStatusColor(o.status), color:'white', padding:'4px 10px', borderRadius:'4px', fontSize:'11px', fontWeight: 'bold'}}>{o.status}</span></div>
                    <p style={{fontSize:'12px', marginTop:'10px', color:'var(--text-muted)'}}>Amount: ₹{o.totalAmount} <span style={{background: o.paymentType==='UPI'?'#6528F7':'#333', color:'white', padding:'2px 6px', borderRadius:'4px', fontSize:'9px', marginLeft:'5px'}}>{o.paymentType}</span></p>
                  </div>
                ))}
              </div>
              <button onClick={() => {setCurrentUser(null); localStorage.removeItem('rsFashionUser'); navigate('home'); showToast("👋 Logged out successfully", "info");}} style={{marginTop:'20px', padding:'12px', background:'var(--error)', color:'white', border:'none', borderRadius:'5px', width:'100%', fontWeight:'bold', cursor:'pointer'}}>Logout</button>
            </div>
          </motion.div>
        )}

        {currentView === 'chat' && (
          <motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}}>
            <div className="chat-wrapper">
              <div className="chat-header">
                <div className="chat-icon-bg"><i className="fas fa-headphones-alt"></i></div>
                <div><h2 className="brand-font" style={{fontSize: '20px', color:'white', margin:0}}>Concierge Support</h2><p style={{fontSize: '12px', color: '#aaa', margin:0}}>We usually reply instantly</p></div>
              </div>
              <div className="chat-messages">
                <div className="secure-badge">Secure Support Channel</div>
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`chat-bubble ${msg.sender === 'user' ? 'sent' : 'received'}`}>
                    <p style={{margin:0, fontWeight: '500'}}>{msg.text}</p>
                    <div className="chat-time" style={{justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'}}>{msg.time} {msg.sender === 'user' && <i className="fas fa-check-double" style={{color: '#1e90ff'}}></i>}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="chat-input-area">
                <i className="fas fa-image" style={{fontSize: '20px', color: '#aaa', cursor: 'pointer', padding: '0 5px'}}></i>
                <input type="text" className="chat-input" placeholder="Type your message here..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
                <button type="submit" style={{background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0 5px'}}><i className="fas fa-paper-plane" style={{fontSize: '20px'}}></i></button>
              </form>
            </div>
          </motion.div>
        )}
        
        {currentView === 'about' && (<motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}}><div className="about-container"><h2 className="section-title">About Developer</h2><div className="dev-card"><div style={{width: '80px', height: '80px', background: 'var(--accent)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 15px'}}><i className="fas fa-code"></i></div><h3 className="brand-font" style={{fontSize: '24px', marginBottom: '10px'}}>Robiul Islam</h3><p style={{color: 'var(--text-muted)', marginBottom: '20px'}}>Full Stack Developer & UI/UX Designer</p><div style={{background: 'var(--light-bg)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-main)'}}><p>Built with ❤️ using React, Vite, and Firebase.</p></div><button className="btn-buy" style={{marginTop: '20px', width: '100%', padding: '15px'}} onClick={() => window.location.href='mailto:robiulislam786786u@gmail.com'}><i className="fas fa-envelope"></i> Contact Me</button></div></div></motion.div>)}
      </div>
      {/* MODALS & NOTIFICATIONS */}
      {isNotifOpen && (
        <div className="modal" style={{display:'flex'}}><div className="modal-content" style={{padding: '20px', textAlign: 'left', maxHeight:'80vh', overflowY:'auto'}}><div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}><h2 className="brand-font" style={{fontSize:'22px'}}>Notifications</h2><i className="fas fa-times" style={{cursor:'pointer', fontSize:'22px', color:'var(--text-muted)'}} onClick={() => setIsNotifOpen(false)}></i></div>{notifications.length === 0 ? <p style={{textAlign:'center', color:'var(--text-muted)', padding:'20px 0'}}>No new notifications.</p> : (notifications.map(n => (<div key={n.id} style={{padding:'15px', borderBottom:'1px solid var(--border-color)', background: 'var(--light-bg)', borderRadius:'8px', marginBottom:'10px'}}><div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'5px'}}><div style={{width:'30px', height:'30px', background:'var(--accent)', color:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}><i className={n.icon || "fas fa-bell"} style={{fontSize:'12px'}}></i></div><h4 style={{fontSize:'14px', fontWeight:'600'}}>{n.title || 'New Update'}</h4></div><p style={{fontSize:'13px', color:'var(--text-muted)', lineHeight:'1.4', marginTop:'8px'}}>{n.message}</p>{n.date && <p style={{fontSize:'10px', color:'#aaa', marginTop:'8px'}}>{n.date}</p>}</div>)))}</div></div>
      )}
      
      {isLoginOpen && (<div className="modal" style={{display:'flex'}}><div className="modal-content"><span className="close-modal" onClick={() => setIsLoginOpen(false)}>&times;</span><h2 className="brand-font" style={{marginBottom:'20px'}}>User Login</h2><form onSubmit={processLogin}><input name="name" type="text" placeholder="Full Name" required /><input name="phone" type="tel" placeholder="Mobile Number" required /><button type="submit" className="btn-buy" style={{width:'100%', padding:'12px'}}>Login / Generate ID</button></form></div></div>)}
      
      {/* ✨ SMART CHECKOUT MODAL WITH DESKTOP QR CODE DETECTOR ✨ */}
      {isCheckoutOpen && (() => {
        const upiLink = `upi://pay?pa=yourname@upi&pn=RS%20Fashion&am=${getFinalTotal()}&cu=INR`;
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        return (
        <div className="modal" style={{display:'flex'}}><div className="modal-content" style={{textAlign:'center', padding: '25px 20px'}}><span className="close-modal" onClick={() => setIsCheckoutOpen(false)}>&times;</span><h2 className="brand-font" style={{marginBottom:'20px', fontSize:'22px'}}>Complete Order</h2><form onSubmit={processCheckout} style={{textAlign:'left'}}><p style={{fontSize:'13px', fontWeight:'600', marginBottom:'8px', color: 'var(--text-muted)'}}>Shipping Details</p><input name="add1" type="text" placeholder="Address Line 1 (House, Street)" required /><input name="add2" type="text" placeholder="Area / Landmark" required /><input name="pin" type="text" placeholder="Pincode" required /><div style={{display:'flex', gap:'10px', marginBottom:'15px'}}><input type="text" placeholder="Enter Coupon Code" value={couponCode} onChange={(e)=>setCouponCode(e.target.value)} style={{marginBottom:0}}/><button type="button" onClick={applyCoupon} style={{background:'var(--accent)', color:'white', border:'none', borderRadius:'6px', padding:'0 15px', cursor:'pointer', fontFamily:'Jost', fontWeight:'bold'}}>Apply</button></div><div style={{textAlign:'right', fontSize:'14px', fontWeight:'600', marginBottom:'20px'}}><p>Subtotal: ₹{checkoutMode === 'single' ? (selectedProduct.finalPrice || selectedProduct.price) : getCartTotal()}</p><p style={{color:'var(--error)', fontSize:'16px'}}>Total to Pay: ₹{getFinalTotal()}</p></div><div style={{marginBottom: '20px'}}><p style={{fontSize:'13px', fontWeight:'bold', marginBottom:'15px', display:'flex', alignItems:'center', gap:'8px'}}><i className="fas fa-wallet"></i> Select Payment Method:</p>
        <div onClick={() => setPaymentMethod('COD')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', marginBottom: '12px', borderRadius: '8px', cursor: 'pointer', border: paymentMethod === 'COD' ? '1px solid var(--accent)' : '1px solid var(--border-color)', background: paymentMethod === 'COD' ? 'rgba(197, 168, 128, 0.1)' : 'transparent', transition: '0.2s' }}><div style={{display: 'flex', alignItems: 'center', gap: '12px'}}><div style={{fontSize: '20px'}}>💵</div><span style={{fontWeight: '600', fontSize: '14px', color: 'var(--text-main)'}}>Cash on Delivery (COD)</span></div>{paymentMethod === 'COD' ? <i className="fas fa-check-circle" style={{color: 'var(--accent)', fontSize: '18px'}}></i> : <div style={{width:'18px', height:'18px', border:'2px solid var(--border-color)', borderRadius:'50%'}}></div>}</div>
        <div onClick={() => setPaymentMethod('UPI')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', borderRadius: '8px', cursor: 'pointer', border: paymentMethod === 'UPI' ? '1px solid var(--accent)' : '1px solid var(--border-color)', background: paymentMethod === 'UPI' ? 'rgba(197, 168, 128, 0.1)' : 'transparent', transition: '0.2s' }}><div style={{display: 'flex', alignItems: 'center', gap: '15px'}}><div style={{fontSize: '22px', display: 'flex', alignItems: 'center'}}>📱<span style={{color: '#f1c40f', fontSize:'18px'}}>⚡</span></div><div><p style={{fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: 'var(--text-main)'}}>Pay Online (UPI)</p><div style={{display: 'flex', gap: '6px'}}><span style={{fontSize: '9px', background: '#fff', color: '#000', padding: '2px 5px', borderRadius: '3px', fontWeight: 'bold'}}>GPay</span><span style={{fontSize: '9px', background: '#fff', color: '#000', padding: '2px 5px', borderRadius: '3px', fontWeight: 'bold'}}>PhonePe</span><span style={{fontSize: '9px', background: '#fff', color: '#000', padding: '2px 5px', borderRadius: '3px', fontWeight: 'bold'}}>Paytm</span></div></div></div>{paymentMethod === 'UPI' ? <i className="fas fa-check-circle" style={{color: 'var(--accent)', fontSize: '18px'}}></i> : <div style={{width:'18px', height:'18px', border:'2px solid var(--border-color)', borderRadius:'50%'}}></div>}</div>
        <AnimatePresence>{paymentMethod === 'UPI' && (<motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} style={{overflow: 'hidden'}}>
          <div style={{marginTop:'15px', padding:'20px', border:'1px dashed #6528F7', borderRadius:'8px', background:'rgba(101, 40, 247, 0.05)', textAlign:'center'}}>
            <p style={{fontSize:'14px', fontWeight:'bold', color:'#6528F7', marginBottom:'15px'}}>Step 1: Pay ₹{getFinalTotal()}</p>
            
            {isMobileDevice ? (
              <a href={upiLink} target="_blank" rel="noreferrer" style={{display:'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', background:'#6528F7', color:'white', textDecoration:'none', padding:'12px', borderRadius:'8px', fontSize:'14px', fontWeight:'bold', marginBottom:'20px', width:'100%', boxShadow: '0 4px 10px rgba(101, 40, 247, 0.3)'}}><i className="fas fa-bolt"></i> Open UPI App to Pay</a>
            ) : (
              <div style={{background: 'white', padding: '15px', borderRadius: '10px', display: 'inline-block', marginBottom: '20px', border: '2px solid #6528F7'}}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`} alt="Scan to Pay" style={{width: '140px', height: '140px', display: 'block', margin: '0 auto'}}/>
                  <p style={{fontSize: '12px', color: '#6528F7', marginTop: '10px', fontWeight: 'bold', marginBottom: 0}}>Scan QR Code to Pay</p>
              </div>
            )}
            
            <p style={{fontSize:'14px', fontWeight:'bold', color:'var(--error)', marginBottom:'10px'}}>Step 2: Upload Screenshot</p><label style={{display:'block', padding:'25px 15px', border:'1px dashed var(--text-muted)', cursor:'pointer', borderRadius:'8px', fontSize:'13px', background: 'rgba(0,0,0,0.02)', color: 'var(--text-muted)'}}><i className="fas fa-cloud-upload-alt" style={{fontSize:'28px', display:'block', marginBottom:'10px', color:'var(--accent)'}}></i> Tap here to attach screenshot<input type="file" accept="image/*" style={{display:'none'}} onChange={handleImageUpload}/></label>{upiScreenshot && <img src={upiScreenshot} style={{width:'100%', marginTop:'15px', borderRadius:'6px', border: '1px solid var(--border-color)'}} alt="UPI proof"/>}
          </div>
        </motion.div>)}</AnimatePresence></div><button type="submit" style={{width:'100%', padding:'16px', background:'linear-gradient(90deg, #c5a880, #e3cfa8, #c5a880)', color:'#000', border:'none', borderRadius:'8px', fontWeight:'bold', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(197, 168, 128, 0.3)'}}>🚀 Confirm & Order Now 🎁</button></form></div></div>
        );
      })()}

      <div className="floating-chat" onClick={() => navigate('chat')}><i className="fas fa-comment-dots"></i></div>
      <div className={`toast-notification ${toast.show ? 'show' : ''}`} style={{background: toast.type==='error'?'var(--error)':(toast.type==='info'?'var(--info)':'var(--success)'), color:'white'}}>{toast.msg}</div>
      <footer style={{ background: '#111', color: '#fff', textAlign: 'center', padding: '50px 20px', marginTop: '40px' }}><h2 className="brand-font" style={{ letterSpacing: '2px', marginBottom: '10px' }}>RS FASHION</h2><p style={{ fontSize: '13px', color: '#aaa', marginBottom: '25px' }}>Premium modest wear shipped directly to you.</p><p style={{ fontSize: '12px', color: '#666' }}>© 2026 RS Fashion. Developed by Robiul Islam.</p></footer>
    </>
  );
}
