import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';

const DB_URL = "https://leon-41242-default-rtdb.firebaseio.com/";

// 📸 EXACT LOCAL IMAGES FROM GITHUB REPOSITORY 📸
const SLIDERS = ["./slider1.jpg", "./slider2.jpg", "./slider3.jpg"];
const CATS = [
  { name: "Chiffon", img: "./cat1.jpg" },
  { name: "Cotton", img: "./cat2.jpg" },
  { name: "Abayas", img: "./cat3.jpg" },
  { name: "Undercaps", img: "./cat1.jpg" } // Reusing cat1 to prevent missing file crash
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
  const [upiScreenshot, setUpiScreenshot] = useState('');
  
  // Real Admin Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  // Night Sky Stars State
  const [stars, setStars] = useState([]);

  useEffect(() => {
    const isDark = localStorage.getItem('rsDarkModeMain') === 'true';
    setIsDarkMode(isDark);
    if(isDark) document.body.classList.add('dark-mode');

    const savedUser = localStorage.getItem('rsFashionUser');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    const savedCart = localStorage.getItem('rsFashionCart');
    if (savedCart) setCart(JSON.parse(savedCart));

    const fetchDB = async () => {
      try {
        const res = await fetch(DB_URL + 'products.json');
        const data = await res.json();
        if(data) setProducts(Object.keys(data).map(k => ({ id: k, ...data[k] })));
      } catch (e) { console.error(e); }
    };
    fetchDB();

    // Generate Stars for Dark Mode
    const generatedStars = Array.from({ length: 50 }).map((_, i) => ({
      id: i, top: Math.random() * 100 + '%', left: Math.random() * 100 + '%',
      size: Math.random() * 3 + 'px', delay: Math.random() * 5 + 's'
    }));
    setStars(generatedStars);
  }, []);

  useEffect(() => {
    if (currentView === 'home') {
      const timer = setInterval(() => setCurrentSlide((p) => (p + 1) % SLIDERS.length), 4000);
      return () => clearInterval(timer);
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'chat' && currentUser) fetchMessages();
  }, [currentView, currentUser]);
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
    if(view === 'orders') fetchMyOrders();
  };

  const addToCart = (product) => {
    if(product.status === 'Out of Stock' || product.stock <= 0) return showToast("⚠️ Sold Out!", "error");
    const finalPrice = product.discount > 0 ? Math.round(product.price - (product.price * (product.discount/100))) : product.price;
    const newCart = [...cart, { ...product, finalPrice }];
    setCart(newCart); localStorage.setItem('rsFashionCart', JSON.stringify(newCart));
    showToast("🛍️ Added to Cart!");
    if(currentUser?.dbKey) fetch(`${DB_URL}users/${currentUser.dbKey}.json`, { method: 'PATCH', body: JSON.stringify({ cart: newCart }) });
  };

  const removeFromCart = (index) => {
    const newCart = [...cart]; newCart.splice(index, 1);
    setCart(newCart); localStorage.setItem('rsFashionCart', JSON.stringify(newCart));
  };

  const getCartTotal = () => cart.reduce((t, item) => t + parseInt(item.finalPrice || item.price), 0);
  const getFinalTotal = () => checkoutMode === 'single' ? (selectedProduct.finalPrice || selectedProduct.price) : getCartTotal();

  // 💬 REAL FIREBASE CHAT LOGIC 💬
  const fetchMessages = async () => {
    try {
      const res = await fetch(`${DB_URL}chat_${currentUser.userId}.json`);
      const data = await res.json();
      if (data) setChatMessages(Object.values(data));
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch(e) {}
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;
    const newMsg = { text: chatInput, sender: 'user', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    setChatMessages([...chatMessages, newMsg]); // Optimistic update
    setChatInput('');
    try {
      await fetch(`${DB_URL}chat_${currentUser.userId}.json`, { method: 'POST', body: JSON.stringify(newMsg) });
      fetchMessages(); // Refresh to ensure sync
    } catch(e) { showToast("Message Failed", "error"); }
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
      setIsLoginOpen(false); showToast("Welcome to RS Fashion!");
    } catch(e) { showToast("Network Error", "error"); }
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
          showToast("Screenshot Attached!");
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const processCheckout = async (e) => {
    e.preventDefault();
    if (paymentMethod === 'UPI' && !upiScreenshot) return showToast("⚠️ Upload screenshot!", "error");
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
      showToast("🎉 Order Placed Successfully!"); navigate('orders');
    } catch(e) { showToast("Order Failed.", "error"); }
  };

  const getStatusColor = (status) => {
    const s = status.toLowerCase();
    if(s.includes('pending')) return 'var(--warning)';
    if(s.includes('reject')) return 'var(--error)';
    return 'var(--success)';
  };
  const renderProductCard = (p) => {
    const finalPrice = p.discount > 0 ? Math.round(p.price - (p.price * (p.discount/100))) : p.price;
    return (
      <div key={p.id} className="product-card glass" onClick={() => navigate('product', { ...p, finalPrice })}>
        {p.discount > 0 && <div style={{position:'absolute', top:'10px', right:'10px', background:'var(--error)', color:'white', padding:'4px 8px', fontSize:'11px', fontWeight:'bold', borderRadius:'4px', zIndex:2}}>{p.discount}% OFF</div>}
        <div className="product-img-wrap"><img src={p.img} alt={p.name}/></div>
        <div className="product-info">
          <h3 style={{fontSize:'14px', marginBottom:'5px'}}>{p.name}</h3>
          <p style={{color:'var(--accent)', fontWeight:'bold'}}>₹{finalPrice}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 🌌 DARK MODE STARS RENDERER 🌌 */}
      {isDarkMode && (
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex: -1, pointerEvents:'none'}}>
          {stars.map(s => <div key={s.id} className="star" style={{top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay}}></div>)}
        </div>
      )}

      <header className="glass">
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
          <div className="icon-btn" onClick={() => setIsSidebarOpen(true)}><i className="fas fa-bars"></i></div>
          <div className="brand-logo" onClick={() => navigate('home')}>RS FASHION</div>
        </div>
        <div className="header-icons">
          <i className={isDarkMode ? 'fas fa-sun' : 'fas fa-moon'} onClick={toggleTheme}></i> 
          <i className="fas fa-search" onClick={() => navigate('shop')}></i> 
          <div style={{position:'relative'}} onClick={() => navigate('cart')}>
            <i className="fas fa-shopping-bag"></i>{cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
          </div>
        </div>
      </header>

      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
      <div className={`sidebar glass ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{padding:'20px', borderBottom:'1px solid var(--border-glass)'}}><h3 className="brand-font">Menu</h3></div>
        <div className="sidebar-links">
          <div onClick={() => navigate('home')}><i className="fas fa-home"></i> Home</div>
          <div onClick={() => navigate('shop')}><i className="fas fa-tshirt"></i> All Products</div>
          <div onClick={() => navigate('cart')}><i className="fas fa-shopping-cart"></i> Cart</div>
          
          {/* 📦 NEW DEDICATED MY ORDERS BUTTON */}
          <div onClick={() => currentUser ? navigate('orders') : setIsLoginOpen(true)}><i className="fas fa-box-open"></i> My Orders</div>
          <div onClick={() => currentUser ? navigate('profile') : setIsLoginOpen(true)}><i className="fas fa-user-circle"></i> My Profile</div>
          <div onClick={() => currentUser ? navigate('chat') : setIsLoginOpen(true)}><i className="fas fa-headphones-alt" style={{color:'var(--accent)'}}></i> Live Support</div>
          <div onClick={() => navigate('about')}><i className="fas fa-code"></i> About Developer</div>
        </div>
      </div>

      <div style={{minHeight: '80vh'}}>
        {currentView === 'home' && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}>
            <div style={{position:'relative', width:'100%', height:'60vh', overflow:'hidden', background:'#000'}}>
              {SLIDERS.map((img, i) => (
                <div key={i} style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', backgroundImage:`url(${img})`, backgroundSize:'cover', backgroundPosition:'center', opacity: i===currentSlide ? 0.8 : 0, transition:'1s'}} />
              ))}
              <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', color:'white', textAlign:'center', zIndex:10, textShadow:'0 2px 10px rgba(0,0,0,0.5)'}}>
                <h1 className="brand-font" style={{fontSize:'38px', marginBottom:'10px'}}>Atmosphere</h1>
                <p>Modest fashion for the soul.</p>
              </div>
            </div>
            
            <div className="view-container">
              <h2 className="section-title brand-font">Shop by Category</h2>
              <div className="categories">
                {CATS.map((cat, i) => (
                  <div key={i} className="category-item" onClick={() => navigate('shop')}><img src={cat.img} className="category-img" alt={cat.name}/><p style={{fontSize:'13px', marginTop:'8px'}}>{cat.name}</p></div>
                ))}
              </div>
              <h2 className="section-title brand-font">Trending Now</h2>
              <div className="products-grid">{products.slice(0,8).map(renderProductCard)}</div>
            </div>
          </motion.div>
        )}
        {currentView === 'shop' && (
          <motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}}>
            <h2 className="section-title brand-font">All Products</h2>
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{width:'100%', padding:'14px', borderRadius:'12px', border:'1px solid var(--border-glass)', marginBottom:'20px', background:'var(--card-glass)', color:'var(--text-main)', fontFamily:'Jost'}} />
            <div className="products-grid">{products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(renderProductCard)}</div>
          </motion.div>
        )}

        {currentView === 'product' && selectedProduct && (
          <motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}}>
            <div style={{display:'flex', flexWrap:'wrap', gap:'30px'}}>
              <div style={{flex:1, minWidth:'300px'}}><img src={selectedProduct.img} style={{width:'100%', borderRadius:'16px'}} alt=""/></div>
              <div style={{flex:1, minWidth:'300px'}}>
                <h1 className="brand-font" style={{fontSize:'28px'}}>{selectedProduct.name}</h1>
                <p style={{fontSize:'24px', color:'var(--accent)', fontWeight:'bold', margin:'15px 0'}}>₹{selectedProduct.finalPrice}</p>
                <div style={{display:'flex', gap:'15px', marginTop:'30px'}}>
                  <button onClick={() => addToCart(selectedProduct)} style={{flex:1, padding:'15px', background:'transparent', border:'2px solid var(--accent)', color:'var(--text-main)', borderRadius:'12px', fontWeight:'bold', cursor:'pointer'}}>Add to Cart</button>
                  <button onClick={() => { if(!currentUser) return setIsLoginOpen(true); setCheckoutMode('single'); setIsCheckoutOpen(true); }} style={{flex:1, padding:'15px', background:'var(--accent)', border:'none', color:'white', borderRadius:'12px', fontWeight:'bold', cursor:'pointer'}}>Buy Now</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 📦 THE NEW SEPARATE MY ORDERS PAGE */}
        {currentView === 'orders' && (
          <motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}}>
            <h2 className="section-title brand-font">My Orders</h2>
            <div style={{maxWidth:'600px', margin:'0 auto'}}>
              {orders.length === 0 ? <p style={{textAlign:'center', opacity:0.6}}>No orders found.</p> : orders.map((o, i) => (
                <div key={i} className="glass" style={{padding:'20px', borderRadius:'16px', marginBottom:'15px', borderLeft:`5px solid ${getStatusColor(o.status)}`}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px'}}>
                    <b style={{fontSize:'15px'}}>{o.items}</b>
                    <span style={{background:getStatusColor(o.status), color:'white', padding:'4px 10px', borderRadius:'6px', fontSize:'11px', fontWeight:'bold'}}>{o.status}</span>
                  </div>
                  <p style={{fontSize:'13px', opacity:0.7}}>🚚 {o.deliveryTime}</p>
                  <div style={{display:'flex', justifyContent:'space-between', marginTop:'15px', borderTop:'1px solid var(--border-glass)', paddingTop:'15px'}}>
                    <b style={{color:'var(--accent)'}}>₹{o.totalAmount}</b>
                    <span style={{fontSize:'11px', background:'rgba(0,0,0,0.1)', padding:'4px 8px', borderRadius:'4px'}}>{o.paymentType}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 💬 REAL FIREBASE CHAT INTERFACE */}
        {currentView === 'chat' && (
          <motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}}>
            <div className="chat-wrapper glass" style={{maxWidth:'600px', margin:'0 auto'}}>
              <div style={{padding:'20px', borderBottom:'1px solid var(--border-glass)', display:'flex', alignItems:'center', gap:'15px'}}>
                <div style={{width:'40px', height:'40px', background:'var(--accent)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white'}}><i className="fas fa-headset"></i></div>
                <div><h3 style={{fontSize:'16px'}}>Admin Support</h3><p style={{fontSize:'11px', opacity:0.7}}>Secure Connection</p></div>
              </div>
              <div className="chat-messages">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`chat-bubble ${msg.sender === 'user' ? 'sent' : 'received'}`}>
                    <p>{msg.text}</p>
                    <span style={{fontSize:'9px', opacity:0.7, display:'block', textAlign:'right', marginTop:'5px'}}>{msg.time}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} style={{padding:'15px', borderTop:'1px solid var(--border-glass)', display:'flex', gap:'10px'}}>
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Message admin..." style={{flex:1, padding:'12px 15px', borderRadius:'20px', border:'1px solid var(--border-glass)', background:'rgba(0,0,0,0.05)', color:'var(--text-main)', outline:'none'}}/>
                <button type="submit" style={{width:'45px', height:'45px', borderRadius:'50%', background:'var(--accent)', color:'white', border:'none', cursor:'pointer'}}><i className="fas fa-paper-plane"></i></button>
              </form>
            </div>
          </motion.div>
        )}
        {currentView === 'cart' && (
          <motion.div className="view-container" style={{maxWidth:'700px', margin:'0 auto'}} initial={{opacity:0}} animate={{opacity:1}}>
            <h2 className="section-title brand-font">Your Cart</h2>
            {cart.length === 0 ? <p style={{textAlign:'center', opacity:0.6}}>Cart is empty.</p> : (
              <>{cart.map((item, i) => (<div key={i} className="glass" style={{display:'flex', alignItems:'center', gap:'15px', padding:'15px', borderRadius:'16px', marginBottom:'15px'}}><img src={item.img} style={{width:'70px', borderRadius:'8px'}} alt=""/><div style={{flex:1}}><h4 style={{fontSize:'15px'}}>{item.name}</h4><p style={{color:'var(--accent)', fontWeight:'bold'}}>₹{item.finalPrice}</p></div><i className="fas fa-trash" style={{color:'var(--error)', cursor:'pointer', fontSize:'18px'}} onClick={() => removeFromCart(i)}></i></div>))}
                <div style={{textAlign:'right', fontSize:'20px', fontWeight:'bold', margin:'20px 0'}}>Total: ₹{getCartTotal()}</div><button className="btn-main" onClick={() => { if(!currentUser) return setIsLoginOpen(true); setCheckoutMode('cart'); setIsCheckoutOpen(true); }}>Checkout All Items</button></>
            )}
          </motion.div>
        )}

        {currentView === 'profile' && currentUser && (
          <motion.div className="view-container" style={{maxWidth:'600px', margin:'0 auto'}} initial={{opacity:0}} animate={{opacity:1}}>
            <div className="glass" style={{padding:'30px', borderRadius:'16px', textAlign:'center'}}>
              <div style={{width:'80px', height:'80px', background:'var(--accent)', color:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', margin:'0 auto 15px'}}><i className="fas fa-user"></i></div>
              <h2 className="brand-font">{currentUser.name}</h2><p style={{opacity:0.6, fontSize:'13px', marginBottom:'30px'}}>ID: {currentUser.userId}</p>
              <button onClick={() => {setCurrentUser(null); localStorage.removeItem('rsFashionUser'); navigate('home'); showToast("Logged out!");}} className="btn-main" style={{background:'var(--error)'}}>Logout</button>
            </div>
          </motion.div>
        )}

        {currentView === 'about' && (
          <motion.div className="view-container" initial={{opacity:0}} animate={{opacity:1}}><div className="glass" style={{padding:'40px', borderRadius:'16px', textAlign:'center', maxWidth:'600px', margin:'0 auto'}}><h2 className="brand-font" style={{marginBottom:'10px'}}>Robiul Islam</h2><p style={{opacity:0.7, marginBottom:'20px'}}>Full Stack Developer & UI/UX Designer</p><button className="btn-main" onClick={() => window.location.href='mailto:robiulislam786786u@gmail.com'}>Contact Me</button></div></motion.div>
        )}
      </div>

      {isLoginOpen && (<div className="modal" style={{display:'flex'}}><div className="modal-content glass"><span onClick={() => setIsLoginOpen(false)} style={{position:'absolute', top:'15px', right:'20px', fontSize:'24px', cursor:'pointer'}}>&times;</span><h2 className="brand-font" style={{marginBottom:'20px'}}>Login</h2><form onSubmit={processLogin}><input name="name" placeholder="Full Name" required /><input name="phone" placeholder="Phone Number" required /><button type="submit" className="btn-main">Login / Create Account</button></form></div></div>)}
      
      
      
      
      {isCheckoutOpen && (() => {
        const upiLink = `upi://pay?pa=yourname@upi&pn=RS%20Fashion&am=${getFinalTotal()}&cu=INR`;
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
       
        return (<div className="modal" style={{display:'flex'}}><div className="modal-content glass"><span onClick={() => setIsCheckoutOpen(false)} style={{position:'absolute', top:'15px', right:'20px', fontSize:'24px', cursor:'pointer'}}>&times;</span><h2 className="brand-font" style={{marginBottom:'20px'}}>Checkout</h2><form onSubmit={processCheckout}><input name="add1" placeholder="Address Line 1" required /><input name="add2" placeholder="Landmark" required /><input name="pin" placeholder="Pincode" required /><div style={{textAlign:'right', fontWeight:'bold', fontSize:'18px', color:'var(--accent)', margin:'15px 0'}}>Total: ₹{getFinalTotal()}</div><div style={{marginBottom:'15px'}}><div onClick={() => setPaymentMethod('COD')} style={{padding:'12px', border:paymentMethod==='COD'?'2px solid var(--accent)':'1px solid var(--border-glass)', borderRadius:'8px', cursor:'pointer', marginBottom:'10px'}}>💵 Cash on Delivery</div><div onClick={() => setPaymentMethod('UPI')} style={{padding:'12px', border:paymentMethod==='UPI'?'2px solid var(--accent)':'1px solid var(--border-glass)', borderRadius:'8px', cursor:'pointer'}}>📱 Pay Online (UPI)</div>{paymentMethod==='UPI' && <div style={{textAlign:'center', marginTop:'15px'}}>{isMobileDevice ? <a href={upiLink} target="_blank" rel="noreferrer" className="btn-main" style={{display:'block', textDecoration:'none', marginBottom:'10px'}}><i className="fas fa-bolt"></i> Open UPI App</a> : <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}`} alt="QR" style={{background:'white', padding:'10px', borderRadius:'10px', marginBottom:'10px'}}/>}<label style={{display:'block', padding:'15px', border:'1px dashed var(--border-glass)', borderRadius:'8px', cursor:'pointer'}}><i className="fas fa-upload"></i> Upload Screenshot<input type="file" accept="image/*" onChange={handleImageUpload} style={{display:'none'}}/></label>{upiScreenshot && <img src={upiScreenshot} style={{width:'100%', marginTop:'10px', borderRadius:'8px'}} alt="Proof"/>}</div></div><button type="submit" className="btn-main">Confirm Order</button></form></div></div>);
      })()}

      <div className={`toast-notification glass ${toast.show ? 'show' : ''}`} style={{background:'var(--accent)', color:'white', border:'none'}}>{toast.msg}</div>
      <footer style={{textAlign:'center', padding:'40px 20px', opacity:0.6, fontSize:'12px'}}><p>© 2026 RS Fashion. Developed by Robiul Islam.</p></footer>
    </>
  );
}
