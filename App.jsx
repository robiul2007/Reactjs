import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './index.css';

const DB_URL = "https://leon-41242-default-rtdb.firebaseio.com/";
const SLIDERS = ["./slider1.jpg", "./slider2.jpg", "./slider3.jpg"];
const CATS = [
  { name: "Chiffon", img: "./cat1.jpg" },
  { name: "Cotton", img: "./cat2.jpg" },
  { name: "Abayas", img: "./cat3.jpg" },
  { name: "Undercaps", img: "./cat1.jpg" }
];

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('home'); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All'); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', bg: '' });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [orders, setOrders] = useState([]);
  const [checkoutMode, setCheckoutMode] = useState('single');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [upiScreenshot, setUpiScreenshot] = useState('');
  
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    const isDark = localStorage.getItem('rsDarkModeMain') === 'true';
    setIsDarkMode(isDark);
    if(isDark) document.body.classList.add('dark-mode');

    const savedUser = localStorage.getItem('rsFashionUser');
    if (savedUser) {
      const pUser = JSON.parse(savedUser);
      setCurrentUser(pUser);
      if(pUser.profilePic) setProfilePic(pUser.profilePic);
    }
    const savedCart = localStorage.getItem('rsFashionCart');
    if (savedCart) setCart(JSON.parse(savedCart));

    const fetchDB = async () => {
      try {
        const res = await fetch(DB_URL + 'products.json');
        const data = await res.json();
        if(data) setProducts(Object.keys(data).map(k => ({ id: k, ...data[k] })));
      } catch (e) {}
    };
    fetchDB();
  }, []);
  useEffect(() => {
    if (currentView === 'home') {
      const timer = setInterval(() => setCurrentSlide((p) => (p + 1) % SLIDERS.length), 4000);
      return () => clearInterval(timer);
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'chat' && currentUser) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [currentView, currentUser]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('rsDarkModeMain', !isDarkMode);
  };

  const showToast = (msg, bg = 'var(--success)') => { setToast({ show: true, msg, bg }); setTimeout(() => setToast({ show: false, msg: '', bg: '' }), 3000); };

  const navigate = (view, product = null) => {
    if(product) setSelectedProduct(product);
    setCurrentView(view); setIsSidebarOpen(false); window.scrollTo(0, 0);
    if(view === 'orders') fetchMyOrders();
    if(view === 'chat') fetchMessages();
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % SLIDERS.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? SLIDERS.length - 1 : prev - 1));

  const addToCart = (product) => {
    if(product.status === 'Out of Stock' || product.stock <= 0) return showToast("Sold Out!", "var(--error)");
    const finalPrice = product.discount > 0 ? Math.round(product.price - (product.price * (product.discount/100))) : product.price;
    const newCart = [...cart, { ...product, finalPrice }];
    setCart(newCart); localStorage.setItem('rsFashionCart', JSON.stringify(newCart));
    showToast("Added to Cart!");
    if(currentUser?.dbKey) fetch(`${DB_URL}users/${currentUser.dbKey}.json`, { method: 'PATCH', body: JSON.stringify({ cart: newCart }) });
  };

  const removeFromCart = (index) => {
    const newCart = [...cart]; newCart.splice(index, 1);
    setCart(newCart); localStorage.setItem('rsFashionCart', JSON.stringify(newCart));
  };

  const getCartTotal = () => cart.reduce((t, item) => t + parseInt(item.finalPrice || item.price), 0);
  const getFinalTotal = () => checkoutMode === 'single' ? (selectedProduct.finalPrice || selectedProduct.price) : getCartTotal();

  const fetchMessages = async () => {
    if(!currentUser) return;
    try {
      const res = await fetch(`${DB_URL}chat_${currentUser.userId}.json`);
      const data = await res.json();
      if (data) setChatMessages(Object.values(data));
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch(e) {}
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;
    const newMsg = { text: chatInput, sender: 'user', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    setChatMessages([...chatMessages, newMsg]); setChatInput('');
    try { await fetch(`${DB_URL}chat_${currentUser.userId}.json`, { method: 'POST', body: JSON.stringify(newMsg) }); } catch(e) {}
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
      if(existingUser) { userObj = { ...existingUser, dbKey: existingKey }; } 
      else {
        userObj = { name, phone, userId: `RS${Math.floor(10000+Math.random()*90000)}`, cart: [] };
        const postRes = await fetch(DB_URL + 'users.json', { method: 'POST', body: JSON.stringify(userObj) });
        const postData = await postRes.json(); userObj.dbKey = postData.name;
      }
      setCurrentUser(userObj); localStorage.setItem('rsFashionUser', JSON.stringify(userObj));
      if(userObj.profilePic) setProfilePic(userObj.profilePic);
      setIsLoginOpen(false); showToast("Welcome back!", "var(--info)");
    } catch(e) { showToast("Error", "var(--error)"); }
  };

  const handleProfileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        setProfilePic(base64); showToast("Profile Updated!");
        if(currentUser?.dbKey) {
          const updatedUser = { ...currentUser, profilePic: base64 };
          setCurrentUser(updatedUser); localStorage.setItem('rsFashionUser', JSON.stringify(updatedUser));
          await fetch(`${DB_URL}users/${currentUser.dbKey}.json`, { method: 'PATCH', body: JSON.stringify({ profilePic: base64 }) });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if(file) { const r = new FileReader(); r.onload = (ev) => setUpiScreenshot(ev.target.result); r.readAsDataURL(file); }
  };

  const processCheckout = async (e) => {
    e.preventDefault();
    if (paymentMethod === 'UPI' && !upiScreenshot) return showToast("Upload screenshot!", "var(--error)");
    const orderData = {
      userId: currentUser.userId, customerName: currentUser.name, phone: currentUser.phone,
      address: `${e.target.add1.value}, ${e.target.add2.value} - ${e.target.pin.value}`,
      items: checkoutMode === 'single' ? selectedProduct.name : cart.map(i=>i.name).join(", "),
      totalAmount: getFinalTotal(), status: "Pending", deliveryTime: "Awaiting Confirmation", paymentType: paymentMethod
    };
    try {
      await fetch(DB_URL + 'orders.json', { method: 'POST', body: JSON.stringify(orderData) });
      setIsCheckoutOpen(false); setUpiScreenshot('');
      if(checkoutMode === 'cart') { setCart([]); localStorage.setItem('rsFashionCart', JSON.stringify([])); }
      showToast("Order Placed Successfully!"); navigate('orders');
    } catch(e) { showToast("Order Failed.", "var(--error)"); }
  };

  const getStatusColor = (s) => { const st=s.toLowerCase(); return st.includes('pending')?'var(--warning)':st.includes('reject')?'var(--error)':'var(--success)'; };
  const renderProductCard = (p) => {
    const finalPrice = p.discount > 0 ? Math.round(p.price - (p.price * (p.discount/100))) : p.price;
    return (
      <div key={p.id} className="product-card" onClick={() => navigate('product', { ...p, finalPrice })}>
        {p.discount > 0 && <div style={{position:'absolute', top:'10px', right:'10px', background:'var(--error)', color:'white', padding:'4px 8px', fontSize:'11px', fontWeight:'bold', borderRadius:'4px', zIndex:2}}>{p.discount}% OFF</div>}
        <div className="product-img-wrap"><img src={p.img} alt={p.name}/></div>
        <div className="product-info">
          <h3 style={{fontSize:'14px', marginBottom:'5px'}}>{p.name}</h3><p style={{color:'var(--accent)', fontWeight:'bold'}}>₹{finalPrice}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <header>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}><i className="fas fa-bars" style={{fontSize:'20px', cursor:'pointer'}} onClick={() => setIsSidebarOpen(true)}></i><div className="brand-logo" onClick={() => navigate('home')}>RS FASHION</div></div>
        <div className="header-icons">
          <i className={isDarkMode ? 'fas fa-sun' : 'fas fa-moon'} onClick={toggleTheme}></i> 
          <i className="fas fa-search" onClick={() => navigate('shop')}></i> 
          <div style={{position:'relative'}} onClick={() => navigate('cart')}><i className="fas fa-shopping-bag"></i>{cart.length > 0 && <span className="cart-badge">{cart.length}</span>}</div>
        </div>
      </header>

      {isSidebarOpen && <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1999}} onClick={() => setIsSidebarOpen(false)}></div>}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{padding:'20px', borderBottom:'1px solid var(--border-color)'}}><h3 className="brand-font">Menu</h3></div>
        <div className="sidebar-links">
          <div onClick={() => navigate('home')}><i className="fas fa-home"></i> Home</div>
          <div onClick={() => { setActiveCategory('All'); navigate('shop'); }}><i className="fas fa-tshirt"></i> All Products</div>
          <div onClick={() => navigate('cart')}><i className="fas fa-shopping-cart"></i> Cart</div>
          <div onClick={() => currentUser ? navigate('orders') : setIsLoginOpen(true)}><i className="fas fa-box-open"></i> My Orders</div>
          <div onClick={() => currentUser ? navigate('profile') : setIsLoginOpen(true)}><i className="fas fa-user-circle"></i> My Profile</div>
          <div onClick={() => currentUser ? navigate('chat') : setIsLoginOpen(true)}><i className="fas fa-headphones-alt" style={{color:'var(--accent)'}}></i> Live Support</div>
          <div onClick={() => window.location.href='mailto:robiulislam786786u@gmail.com'}><i className="fas fa-envelope"></i> Contact Us</div>
        </div>
      </div>

      <div style={{minHeight: '80vh'}}>
        {currentView === 'home' && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}>
            <div style={{position:'relative', width:'100%', height:'50vh', overflow:'hidden', background:'#000'}}>
              <button className="slider-arrow left" onClick={prevSlide}><i className="fas fa-chevron-left"></i></button>
              <button className="slider-arrow right" onClick={nextSlide}><i className="fas fa-chevron-right"></i></button>
              {SLIDERS.map((img, i) => (<div key={i} style={{position:'absolute', inset:0, backgroundImage:`url(${img})`, backgroundSize:'cover', backgroundPosition:'center', opacity: i===currentSlide ? 0.8 : 0, transition:'1s'}} />))}
            </div>
            <div className="view-container">
              <h2 className="section-title brand-font">Shop by Category</h2>
              <div className="categories">
                {CATS.map((cat, i) => (<div key={i} className="category-item" onClick={() => { setActiveCategory(cat.name); navigate('shop'); }}><img src={cat.img} className="category-img" alt={cat.name}/><p style={{fontSize:'13px', marginTop:'8px', color:'var(--text-main)'}}>{cat.name}</p></div>))}
              </div>
              <h2 className="section-title brand-font">Trending Now</h2>
              <div className="products-grid">{products.slice(0,8).map(renderProductCard)}</div>
            </div>
          </motion.div>
        )}
        {currentView === 'shop' && (() => {
          const filtered = activeCategory === 'All' ? products : products.filter(p => p.name.toLowerCase().includes(activeCategory.toLowerCase()) || (p.category && p.category.toLowerCase() === activeCategory.toLowerCase()));
          return (
          <motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}}>
            <h2 className="section-title brand-font">{activeCategory === 'All' ? 'All Products' : `${activeCategory} Collection`}</h2>
            <div style={{display:'flex', gap:'10px', overflowX:'auto', marginBottom:'20px', paddingBottom:'10px'}}>
              <button onClick={()=>setActiveCategory('All')} style={{padding:'8px 16px', borderRadius:'20px', border:'1px solid var(--border-color)', background:activeCategory==='All'?'var(--accent)':'var(--card-bg)', color:activeCategory==='All'?'#000':'var(--text-main)', cursor:'pointer', fontWeight:'bold'}}>All</button>
              {CATS.map(c => <button key={c.name} onClick={()=>setActiveCategory(c.name)} style={{padding:'8px 16px', borderRadius:'20px', border:'1px solid var(--border-color)', background:activeCategory===c.name?'var(--accent)':'var(--card-bg)', color:activeCategory===c.name?'#000':'var(--text-main)', cursor:'pointer', whiteSpace:'nowrap', fontWeight:'bold'}}>{c.name}</button>)}
            </div>
            <div className="products-grid">{filtered.length > 0 ? filtered.map(renderProductCard) : <p style={{textAlign:'center', width:'100%'}}>No items found.</p>}</div>
          </motion.div>
        );})()}

        {currentView === 'product' && selectedProduct && (
          <motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}}>
            <div style={{display:'flex', flexWrap:'wrap', gap:'20px'}}>
              <div style={{flex:1, minWidth:'280px'}}><img src={selectedProduct.img} style={{width:'100%', borderRadius:'8px'}} alt=""/></div>
              <div style={{flex:1, minWidth:'280px'}}>
                <h1 className="brand-font" style={{fontSize:'26px', marginBottom:'10px'}}>{selectedProduct.name}</h1>
                <p style={{fontSize:'22px', color:'var(--accent)', fontWeight:'bold', marginBottom:'20px'}}>₹{selectedProduct.finalPrice}</p>
                <div style={{display:'flex', gap:'10px'}}>
                  <button onClick={() => addToCart(selectedProduct)} style={{flex:1, padding:'15px', background:'var(--light-bg)', border:'1px solid var(--border-color)', color:'var(--text-main)', borderRadius:'5px', fontWeight:'bold'}}>Add to Cart</button>
                  <button onClick={() => { if(!currentUser) return setIsLoginOpen(true); setCheckoutMode('single'); setIsCheckoutOpen(true); }} style={{flex:1, padding:'15px', background:'var(--primary)', border:'none', color:'var(--bg-color)', borderRadius:'5px', fontWeight:'bold'}}>Buy Now</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentView === 'orders' && (
          <motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}}>
            <h2 className="section-title brand-font">My Orders</h2>
            <div style={{maxWidth:'600px', margin:'0 auto'}}>
              {orders.length === 0 ? <p style={{textAlign:'center'}} className="text-muted">No orders found.</p> : orders.map((o, i) => (
                <div key={i} style={{background:'var(--card-bg)', border:`1px solid var(--border-color)`, borderLeft:`5px solid ${getStatusColor(o.status)}`, padding:'15px', borderRadius:'8px', marginBottom:'15px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}><b style={{fontSize:'14px'}}>{o.items}</b><span style={{background:getStatusColor(o.status), color:'white', padding:'3px 8px', borderRadius:'4px', fontSize:'11px'}}>{o.status}</span></div>
                  <p style={{fontSize:'12px', color:'var(--text-muted)'}}>🚚 {o.deliveryTime}</p>
                  <div style={{display:'flex', justifyContent:'space-between', marginTop:'10px', borderTop:'1px solid var(--border-color)', paddingTop:'10px'}}><b style={{color:'var(--accent)'}}>₹{o.totalAmount}</b><span style={{fontSize:'11px', background:'var(--light-bg)', padding:'3px 8px', borderRadius:'4px'}}>{o.paymentType}</span></div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {currentView === 'chat' && (
          <motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}}>
            <div className="chat-wrapper" style={{maxWidth:'600px', margin:'0 auto'}}>
              <div style={{padding:'15px', borderBottom:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:'15px'}}>
                <div style={{width:'35px', height:'35px', background:'var(--accent)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#000'}}><i className="fas fa-headset"></i></div>
                <div><h3 style={{fontSize:'15px', margin:0}}>Admin Support</h3></div>
              </div>
              <div className="chat-messages">
                {chatMessages.length === 0 ? <p style={{textAlign:'center', marginTop:'20px', color:'var(--text-muted)'}}>Send a message to start chat</p> : null}
                {chatMessages.map((msg, i) => (<div key={i} className={`chat-bubble ${msg.sender === 'user' ? 'sent' : 'received'}`}><p style={{margin:0}}>{msg.text}</p><span style={{fontSize:'9px', opacity:0.7, display:'block', textAlign:'right', marginTop:'5px'}}>{msg.time}</span></div>))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} style={{padding:'12px', borderTop:'1px solid var(--border-color)', display:'flex', gap:'10px', background:'var(--card-bg)'}}>
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Message admin..." style={{flex:1, padding:'10px 15px', borderRadius:'5px', border:'1px solid var(--border-color)', background:'var(--bg-color)', color:'var(--text-main)', outline:'none', fontFamily:'Jost'}}/>
                <button type="submit" style={{width:'40px', height:'40px', borderRadius:'5px', background:'var(--primary)', color:'var(--bg-color)', border:'none', cursor:'pointer'}}><i className="fas fa-paper-plane"></i></button>
              </form>
            </div>
          </motion.div>
        )}
        {currentView === 'cart' && (
          <motion.div className="view-container" style={{maxWidth:'700px', margin:'0 auto'}} initial={{opacity:0}} animate={{opacity:1}}>
            <h2 className="section-title brand-font">Your Cart</h2>
            {cart.length === 0 ? <p style={{textAlign:'center', color:'var(--text-muted)'}}>Cart is empty.</p> : (
              <>{cart.map((item, i) => (<div key={i} style={{background:'var(--card-bg)', border:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:'15px', padding:'12px', borderRadius:'8px', marginBottom:'12px'}}><img src={item.img} style={{width:'60px', borderRadius:'4px'}} alt=""/><div style={{flex:1}}><h4 style={{fontSize:'14px', margin:0}}>{item.name}</h4><p style={{color:'var(--accent)', fontWeight:'bold', margin:0}}>₹{item.finalPrice}</p></div><i className="fas fa-trash" style={{cursor:'pointer', fontSize:'16px', color:'var(--error)'}} onClick={() => removeFromCart(i)}></i></div>))}
                <div style={{textAlign:'right', fontSize:'18px', fontWeight:'bold', margin:'20px 0'}}>Total: ₹{getCartTotal()}</div><button className="btn-main" onClick={() => { if(!currentUser) return setIsLoginOpen(true); setCheckoutMode('cart'); setIsCheckoutOpen(true); }}>Checkout All Items</button></>
            )}
          </motion.div>
        )}

        {currentView === 'profile' && currentUser && (
          <motion.div className="view-container" style={{maxWidth:'500px', margin:'0 auto'}} initial={{opacity:0}} animate={{opacity:1}}>
            <div style={{background:'var(--card-bg)', border:'1px solid var(--border-color)', padding:'30px 20px', borderRadius:'8px', textAlign:'center'}}>
              <div className="profile-upload">
                {profilePic ? <img src={profilePic} alt="Profile"/> : <i className="fas fa-user"></i>}
                <label className="upload-btn"><i className="fas fa-camera"></i><input type="file" accept="image/*" onChange={handleProfileUpload} style={{display:'none'}}/></label>
              </div>
              <h2 className="brand-font" style={{fontSize:'24px', margin:'10px 0 5px'}}>{currentUser.name}</h2>
              <p style={{fontSize:'13px', marginBottom:'25px', color:'var(--text-muted)'}}>ID: {currentUser.userId}</p>
              <button onClick={() => navigate('orders')} className="btn-main" style={{background:'var(--light-bg)', color:'var(--text-main)', border:'1px solid var(--border-color)', marginBottom:'10px'}}>View My Orders</button>
              <button onClick={() => {setCurrentUser(null); setProfilePic(''); localStorage.removeItem('rsFashionUser'); navigate('home'); showToast("Logged out!");}} className="btn-main" style={{background:'var(--error)', color:'white'}}>Logout</button>
            </div>
          </motion.div>
        )}
        
        {currentView === 'about' && (
          <motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}}><div style={{background:'var(--card-bg)', border:'1px solid var(--border-color)', padding:'40px', borderRadius:'8px', textAlign:'center', maxWidth:'600px', margin:'0 auto'}}><h2 className="brand-font" style={{marginBottom:'10px'}}>Robiul Islam</h2><p style={{color:'var(--text-muted)', marginBottom:'20px'}}>Full Stack Developer & UI/UX Designer</p><button className="btn-main" onClick={() => window.location.href='mailto:robiulislam786786u@gmail.com'}>Contact Me</button></div></motion.div>
        )}
      </div>

      {isLoginOpen && (<div className="modal"><div className="modal-content"><span onClick={() => setIsLoginOpen(false)} style={{position:'absolute', top:'15px', right:'20px', fontSize:'24px', cursor:'pointer', color:'var(--text-main)'}}>&times;</span><h2 className="brand-font" style={{marginBottom:'20px'}}>Login</h2><form onSubmit={processLogin}><input name="name" placeholder="Full Name" required /><input name="phone" placeholder="Phone Number" required /><button type="submit" className="btn-main">Login / Create Account</button></form></div></div>)}
      
      {isCheckoutOpen && (() => {
        const amt = getFinalTotal();
        const upiLink = `upi://pay?pa=yourname@upi&pn=RS&am=${amt}&cu=INR`;
        const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        return (
          <div className="modal">
            <div className="modal-content glass">
              <span 
                onClick={() => setIsCheckoutOpen(false)} 
                style={{position: 'absolute', top: '15px', right: '20px', fontSize: '24px', cursor: 'pointer', color: 'var(--text-main)'}}
              >
                &times;
              </span>
              <h2 className="brand-font" style={{marginBottom: '20px'}}>Checkout</h2>
              
              <form onSubmit={processCheckout}>
                <input name="add1" placeholder="Address Line 1" required />
                <input name="add2" placeholder="Landmark" required />
                <input name="pin" placeholder="Pincode" required />
                
                <div style={{textAlign: 'right', fontWeight: 'bold', fontSize: '16px', color: 'var(--accent)', margin: '15px 0'}}>
                  Total: ₹{amt}
                </div>
                
                <div style={{marginBottom: '15px'}}>
                  <div 
                    onClick={() => setPaymentMethod('COD')} 
                    style={{padding: '12px', border: paymentMethod === 'COD' ? '2px solid var(--accent)' : '1px solid var(--border-color)', borderRadius: '5px', cursor: 'pointer', marginBottom: '10px', color: 'var(--text-main)'}}
                  >
                    💵 Cash on Delivery
                  </div>
                  <div 
                    onClick={() => setPaymentMethod('UPI')} 
                    style={{padding: '12px', border: paymentMethod === 'UPI' ? '2px solid var(--accent)' : '1px solid var(--border-color)', borderRadius: '5px', cursor: 'pointer', color: 'var(--text-main)'}}
                  >
                    📱 Pay Online (UPI)
                  </div>
                  
                  {paymentMethod === 'UPI' && (
                    <div style={{textAlign: 'center', marginTop: '15px'}}>
                      {isMobileDevice ? (
                        <a 
                          href={upiLink} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn-main" 
                          style={{display: 'block', textDecoration: 'none', marginBottom: '10px'}}
                        >
                          Open UPI App
                        </a>
                      ) : (
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}`} 
                          alt="QR" 
                          style={{background: 'white', padding: '10px', borderRadius: '5px', marginBottom: '10px'}}
                        />
                      )}
                      
                      <label style={{display: 'block', padding: '15px', border: '1px dashed var(--border-color)', borderRadius: '5px', cursor: 'pointer', color: 'var(--text-main)'}}>
                        Upload Screenshot
                        <input type="file" accept="image/*" onChange={handleImageUpload} style={{display: 'none'}} />
                      </label>
                      
                      {upiScreenshot && (
                        <img src={upiScreenshot} style={{width: '100%', marginTop: '10px', borderRadius: '5px'}} alt="Proof" />
                      )}
                    </div>
                  )}
                </div>
                
                <button type="submit" className="btn-main">Confirm Order</button>
              </form>
            </div>
          </div>
        );
      })()}
      <div className={`toast-notification ${toast.show ? 'show' : ''}`} style={{background: toast.bg}}>{toast.msg}</div>
      <footer style={{textAlign:'center', padding:'30px 20px', fontSize:'12px', borderTop:'1px solid var(--border-color)', color:'var(--text-muted)'}}><p>© 2026 RS Fashion. Developed by Robiul Islam.</p></footer>
    </>
  );
}
