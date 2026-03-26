import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const DB_URL = "https://leon-41242-default-rtdb.firebaseio.com/";

export default function App() {
  const [isAuth, setIsAuth] = useState(localStorage.getItem('rsAdminLoggedIn') === 'true');
  const [adminName, setAdminName] = useState(localStorage.getItem('rsAdminUsername') || 'Admin');
  const [authMode, setAuthMode] = useState('login');
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  const [view, setView] = useState('dashboard-view');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('rsDarkMode') === 'true');
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const [products, setProducts] = useState({});
  const [orders, setOrders] = useState({});
  const [users, setUsers] = useState({});
  const [stats, setStats] = useState({ rev: 0, pending: 0, active: 0, cust: 0, units: 0, upi: 0, cod: 0 });
  const [chartData, setChartData] = useState([0,0,0,0,0,0,0]);
  
  const [stockInputs, setStockInputs] = useState({});
  const [activeChatUserId, setActiveChatUserId] = useState(null);
  const [chats, setChats] = useState({});
  const [chatMessages, setChatMessages] = useState({});
  const [adminChatInput, setAdminChatInput] = useState('');
  
  const [settings, setSettings] = useState({ upiId: '', avatar: localStorage.getItem('rsAdminAvatar') || 'https://via.placeholder.com/40' });
  const [delPassState, setDelPassState] = useState(!!localStorage.getItem('rsDeletePassword'));
  const [showResetDel, setShowResetDel] = useState(false);
  
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState(null);

  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isDarkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
  }, [isDarkMode]);

  useEffect(() => {
    if (isAuth) {
      fetchData();
      fetchSettings();
      fetchChatList();
      const interval = setInterval(fetchChatList, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuth]);

  useEffect(() => {
    if (view === 'dashboard-view' && chartRef.current && window.Chart) {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
      const textColor = isDarkMode ? '#e4e6ef' : '#888';
      chartInstanceRef.current = new window.Chart(chartRef.current.getContext('2d'), {
        type: 'line',
        data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [{ label: 'Revenue (₹)', data: chartData, borderColor: '#c5a880', backgroundColor: 'rgba(197, 168, 128, 0.2)', borderWidth: 3, fill: true, tension: 0.4 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks:{color:textColor}, grid:{display:false} }, y: { ticks:{color:textColor}, grid:{color: 'rgba(200,200,200,0.1)'} } } }
      });
    }
  }, [view, chartData, isDarkMode]);

  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
  const showToastMsg = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!authUser || !authPass) return showToastMsg("Enter Username & Password", "error");
    setAuthLoading(true);
    try {
      if (authMode === 'login' && authUser === 'Raizo250' && authPass === 'Raizo250') {
        localStorage.setItem('rsAdminLoggedIn', 'true'); localStorage.setItem('rsAdminUsername', authUser);
        setIsAuth(true); setAdminName(authUser); setAuthLoading(false); return;
      }
      const res = await fetch(DB_URL + 'admins.json'); const data = await res.json() || {};
      const adminList = Object.values(data);
      if (authMode === 'register') {
        if (adminList.find(a => a.username === authUser) || authUser === 'Raizo250') { setAuthLoading(false); return showToastMsg("Username already taken!", "error"); }
        await fetch(DB_URL + 'admins.json', { method: 'POST', body: JSON.stringify({username: authUser, password: authPass}) });
        showToastMsg("Account Created! Please Login.", "success"); setAuthMode('login'); setAuthPass('');
      } else {
        if (adminList.find(a => a.username === authUser && a.password === authPass)) {
          localStorage.setItem('rsAdminLoggedIn', 'true'); localStorage.setItem('rsAdminUsername', authUser);
          setIsAuth(true); setAdminName(authUser);
        } else { showToastMsg("❌ Incorrect Credentials!", "error"); }
      }
    } catch(e) { showToastMsg("Error connecting to server", "error"); }
    setAuthLoading(false);
  };

  const handleLogout = () => { localStorage.removeItem('rsAdminLoggedIn'); localStorage.removeItem('rsAdminUsername'); setIsAuth(false); };

  const fetchData = async () => {
    try {
      let [pRes, uRes, oRes] = await Promise.all([fetch(DB_URL + 'products.json'), fetch(DB_URL + 'users.json'), fetch(DB_URL + 'orders.json')]);
      let pData = await pRes.json() || {}; let uData = await uRes.json() || {}; let oData = await oRes.json() || {};
      setProducts(pData); setUsers(uData); setOrders(oData);
      
      let initialStocks = {}; Object.keys(pData).forEach(k => initialStocks[k] = pData[k].stock); setStockInputs(initialStocks);
      
      let rev = 0, pend = 0, units = 0, upi = 0, cod = 0; let cData = [0,0,0,0,0,0,0];
      Object.keys(oData).forEach((key, i) => {
        let o = oData[key];
        if (o.status === "Delivered") { rev += parseInt(o.totalAmount); cData[i % 7] += parseInt(o.totalAmount); }
        if (o.status === "Pending") pend++;
        units++;
        if (o.paymentType === 'UPI') upi += parseInt(o.totalAmount);
        if (o.paymentType === 'COD') cod += parseInt(o.totalAmount);
      });
      setStats({ rev, pending: pend, active: Object.keys(pData).length, cust: Object.keys(uData).length, units, upi, cod });
      setChartData(cData.reverse());
    } catch (e) {}
  };

  const updateStock = async (id) => {
    const newStock = parseInt(stockInputs[id]);
    if (isNaN(newStock) || newStock < 0) return showToastMsg("Invalid stock value", "error");
    const newStatus = newStock > 0 ? 'Active' : 'Out of Stock';
    try { await fetch(DB_URL + 'products/' + id + '.json', { method: 'PATCH', body: JSON.stringify({ stock: newStock, status: newStatus }) }); showToastMsg("Stock updated!", "success"); fetchData(); } 
    catch(e) { showToastMsg("Failed to update stock", "error"); }
  };

  const updateOrder = async (id, field, value) => {
    if (field === 'save') return showToastMsg("Order updated!", "success");
    try { await fetch(DB_URL + 'orders/' + id + '.json', { method: 'PATCH', body: JSON.stringify({ [field]: value }) }); fetchData(); } catch(e) {}
  };

  const viewFullOrder = (dbKey) => { setModalData({ id: dbKey, ...orders[dbKey] }); setModalType('order-details'); };
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!e.target.p_images.files || e.target.p_images.files.length === 0) return showToastMsg("⚠️ Select at least 1 image!", "error");
    const btn = document.getElementById('submitBtn'); btn.innerHTML = "Uploading..."; btn.disabled = true;
    try {
      let b64Array = [];
      for (let i = 0; i < e.target.p_images.files.length; i++) {
        let b64 = await new Promise((res) => { const reader = new FileReader(); reader.onload = (ev) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const scale = 500 / img.width; canvas.width = 500; canvas.height = img.height * scale; canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); res(canvas.toDataURL('image/jpeg', 0.7)); }; img.src = ev.target.result; }; reader.readAsDataURL(e.target.p_images.files[i]); });
        b64Array.push(b64);
      }
      const productData = { name: e.target.p_name.value, price: parseInt(e.target.p_price.value), discount: e.target.p_discount.value || 0, coupon: e.target.p_coupon.value || "", paymentMode: e.target.p_paymentMode.value, stock: parseInt(e.target.p_stock.value), status: e.target.p_status.value, img: b64Array[0], gallery: b64Array };
      await fetch(DB_URL + 'products.json', { method: 'POST', body: JSON.stringify(productData) });
      showToastMsg("🎉 Product Published!", "success"); e.target.reset(); fetchData(); setView('products-view');
    } catch (err) {}
    btn.innerHTML = "Publish to Live Website"; btn.disabled = false;
  };

  const fetchChatList = async () => { try { let res = await fetch(DB_URL + 'chats.json'); let data = await res.json(); if(data) setChats(data); if(activeChatUserId) fetchAdminMessages(activeChatUserId); } catch(e) {} };
  const fetchAdminMessages = async (userId) => { try { let res = await fetch(`${DB_URL}chats/${userId}/messages.json`); let msgs = await res.json(); if(msgs) setChatMessages(msgs); } catch(e) {} };
  const sendAdminMessage = async () => {
    if (!adminChatInput.trim() || !activeChatUserId) return;
    const msg = adminChatInput.trim(); setAdminChatInput('');
    try { await fetch(`${DB_URL}chats/${activeChatUserId}/messages.json`, { method: 'POST', body: JSON.stringify({ sender: 'admin', text: msg, timestamp: Date.now(), status: 'sent' }) }); fetchAdminMessages(activeChatUserId); } catch(e) {}
  };

  const fetchSettings = async () => { try { let res = await fetch(DB_URL + 'settings.json'); let data = await res.json(); if(data && data.upiId) setSettings(s => ({...s, upiId: data.upiId})); } catch(e) {} };
  const handleDangerAction = async () => {
    if (document.getElementById('delete-auth-pass').value !== localStorage.getItem('rsDeletePassword')) return showToastMsg("❌ Incorrect Password", "error");
    setModalType(null); showToastMsg("⏳ Deleting...", "info");
    try {
      if(modalData === 'orders' || modalData === 'all') await fetch(DB_URL + 'orders.json', { method: 'DELETE' });
      if(modalData === 'users' || modalData === 'all') await fetch(DB_URL + 'users.json', { method: 'DELETE' });
      showToastMsg("✅ Data wiped!", "success"); fetchData();
    } catch(e) {}
  };

  if (!isAuth) {
    return (
      <div className="auth-screen">
        <div className="auth-box">
          <h2 style={{fontFamily: 'Playfair Display', marginBottom: '20px', color: 'var(--text-main)'}}>{authMode === 'login' ? 'RS Admin Login' : 'Admin Registration'}</h2>
          <form onSubmit={handleAuth}>
            <input type="text" className="auth-input" placeholder={authMode === 'login' ? 'Admin Username' : 'Choose Username'} value={authUser} onChange={e=>setAuthUser(e.target.value)} />
            <input type="password" className="auth-input" placeholder={authMode === 'login' ? 'Password' : 'Choose Password'} value={authPass} onChange={e=>setAuthPass(e.target.value)} />
            <button type="submit" className="auth-btn">{authLoading ? 'Processing...' : (authMode === 'login' ? 'Secure Login' : 'Create Account')}</button>
          </form>
          <p style={{marginTop: '15px', fontSize: '13px', color: '#888', cursor: 'pointer', textDecoration: 'underline'}} onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'New Admin? Create Account' : 'Already have an account? Login'}</p>
        </div>
        <div className={`toast ${toast.show ? 'show' : ''} toast-${toast.type}`}><span>{toast.msg}</span></div>
      </div>
    );
  }
  return (
    <>
      <div className="sidebar" style={{left: window.innerWidth <= 768 && !isSidebarOpen ? '-260px' : '0'}}>
        <div className="sidebar-brand">RS ADMIN</div>
        <div style={{padding: '20px 0'}}>
          <div className={`nav-item ${view==='dashboard-view'?'active':''}`} onClick={()=>{setView('dashboard-view'); setIsSidebarOpen(false);}}><i className="fas fa-chart-line" style={{width:'25px'}}></i> Dashboard</div>
          <div className={`nav-item ${view==='analytics-view'?'active':''}`} onClick={()=>{setView('analytics-view'); setIsSidebarOpen(false);}}><i className="fas fa-chart-pie" style={{width:'25px'}}></i> Analytics</div>
          <div className={`nav-item ${view==='products-view'?'active':''}`} onClick={()=>{setView('products-view'); setIsSidebarOpen(false);}}><i className="fas fa-tshirt" style={{width:'25px'}}></i> Inventory</div>
          <div className={`nav-item ${view==='add-product-view'?'active':''}`} onClick={()=>{setView('add-product-view'); setIsSidebarOpen(false);}}><i className="fas fa-plus-circle" style={{width:'25px'}}></i> Add Product</div>
          <div className={`nav-item ${view==='orders-view'?'active':''}`} onClick={()=>{setView('orders-view'); setIsSidebarOpen(false);}}><i className="fas fa-shopping-bag" style={{width:'25px'}}></i> Live Orders</div>
          <div className={`nav-item ${view==='chat-view'?'active':''}`} onClick={()=>{setView('chat-view'); setIsSidebarOpen(false);}}><i className="fas fa-comment-dots" style={{width:'25px'}}></i> Live Chat</div>
          <div className={`nav-item ${view==='customers-view'?'active':''}`} onClick={()=>{setView('customers-view'); setIsSidebarOpen(false);}}><i className="fas fa-users" style={{width:'25px'}}></i> Customers</div>
          <div className={`nav-item ${view==='settings-view'?'active':''}`} onClick={()=>{setView('settings-view'); setIsSidebarOpen(false);}}><i className="fas fa-user-cog" style={{width:'25px'}}></i> Settings</div>
          <div className="nav-item" onClick={handleLogout} style={{color: '#f64e60', marginTop: '30px'}}><i className="fas fa-sign-out-alt" style={{width:'25px'}}></i> Logout</div>
        </div>
      </div>

      <div className="main-content">
        <div className="header">
          <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <i className="fas fa-bars" style={{fontSize: '20px', cursor: 'pointer', display: window.innerWidth <= 768 ? 'block' : 'none'}} onClick={() => setIsSidebarOpen(!isSidebarOpen)}></i>
            <h3 style={{textTransform:'capitalize'}}>{view.replace('-view', '').replace('-', ' ')}</h3>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
            <i className={isDarkMode ? 'fas fa-sun' : 'fas fa-moon'} style={{fontSize: '20px', cursor: 'pointer'}} onClick={() => {setIsDarkMode(!isDarkMode); localStorage.setItem('rsDarkMode', !isDarkMode);}}></i>
            <div style={{fontWeight: 'bold', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'}} onClick={() => setView('settings-view')}>
              <img src={settings.avatar} style={{width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)'}} alt=""/>
              <span>{adminName}</span>
            </div>
          </div>
        </div>

        {view === 'dashboard-view' && (
          <div className="view-section active">
            <div className="stats-grid">
              <div className="stat-card"><div><p>Total Revenue</p><h3>₹{stats.rev.toLocaleString()}</h3></div><i className="fas fa-wallet" style={{fontSize: '30px', color: '#1bc5bd'}}></i></div>
              <div className="stat-card"><div><p>Pending Orders</p><h3>{stats.pending}</h3></div><i className="fas fa-box" style={{fontSize: '30px', color: '#ffa800'}}></i></div>
              <div className="stat-card"><div><p>Active Products</p><h3>{stats.active}</h3></div><i className="fas fa-tags" style={{fontSize: '30px', color: '#3699ff'}}></i></div>
              <div className="stat-card"><div><p>Customers</p><h3>{stats.cust}</h3></div><i className="fas fa-users" style={{fontSize: '30px', color: '#8950fc'}}></i></div>
            </div>
            <div className="card" style={{cursor: 'pointer'}} onClick={() => setView('analytics-view')}>
              <div className="card-header"><h3>Revenue Analytics <span style={{fontSize:'12px', color:'#888', fontWeight:'normal'}}>(Click for details)</span></h3></div>
              <div style={{padding: '20px'}}><canvas ref={chartRef} height="80"></canvas></div>
            </div>
          </div>
        )}

        {view === 'analytics-view' && (
          <div className="view-section active">
            <div className="card">
              <div className="card-header"><h3>Detailed Analytics Report</h3><button className="btn-primary" onClick={fetchData}>Refresh Data</button></div>
              <div className="form-grid">
                <div className="stat-card" style={{background: 'rgba(54, 153, 255, 0.1)', border: '1px solid #3699ff'}}><div><p style={{color:'#3699ff', fontWeight:'bold'}}>Total Units Sold</p><h3 style={{color:'#3699ff'}}>{stats.units}</h3></div><i className="fas fa-shopping-cart" style={{fontSize:'30px', color:'#3699ff'}}></i></div>
                <div className="stat-card" style={{background: 'rgba(27, 197, 189, 0.1)', border: '1px solid #1bc5bd'}}><div><p style={{color:'#1bc5bd', fontWeight:'bold'}}>UPI Payments Received</p><h3 style={{color:'#1bc5bd'}}>₹{stats.upi.toLocaleString()}</h3></div><i className="fas fa-mobile-alt" style={{fontSize:'30px', color:'#1bc5bd'}}></i></div>
                <div className="stat-card" style={{background: 'rgba(255, 168, 0, 0.1)', border: '1px solid #ffa800'}}><div><p style={{color:'#ffa800', fontWeight:'bold'}}>COD Value (Pending/Collected)</p><h3 style={{color:'#ffa800'}}>₹{stats.cod.toLocaleString()}</h3></div><i className="fas fa-money-bill-wave" style={{fontSize:'30px', color:'#ffa800'}}></i></div>
              </div>
            </div>
          </div>
        )}

        {view === 'products-view' && (
          <div className="view-section active">
            <div className="card">
              <div className="card-header"><h3>Live Inventory</h3><button className="btn-primary" onClick={fetchData}><i className="fas fa-sync"></i> Refresh</button></div>
              <div style={{overflowX: 'auto'}}>
                <table><thead><tr><th>Image</th><th>Name & Mode</th><th>Price</th><th>Stock Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {Object.keys(products).reverse().map(key => {
                      const p = products[key];
                      return (
                        <tr key={key}>
                          <td><img src={p.img} style={{width:'40px', height:'40px', borderRadius:'5px'}} alt=""/></td>
                          <td><b>{p.name}</b><br/><span style={{fontSize:'11px'}}>Mode: {p.paymentMode||'Both'}</span></td>
                          <td>₹{p.price}</td>
                          <td><b>{p.stock} units</b><br/><span style={{color: p.status==='Active'?'#1bc5bd':'#f64e60', fontWeight:'bold'}}>● {p.status==='Active'?'In Stock':'Out of Stock'}</span></td>
                          <td>
                            <div style={{display:'flex', gap:'5px', marginBottom:'5px'}}>
                              <input type="number" value={stockInputs[key] ?? ''} onChange={e=>setStockInputs({...stockInputs, [key]: e.target.value})} style={{width:'60px', padding:'5px', border:'1px solid var(--border-color)', borderRadius:'4px', background:'var(--input-bg)', color:'var(--text-main)'}} />
                              <button onClick={() => updateStock(key)} style={{background:'#3699ff', color:'white', border:'none', padding:'6px 10px', borderRadius:'4px', cursor:'pointer'}}><i className="fas fa-save"></i></button>
                            </div>
                            <button onClick={() => {setModalType('confirm'); setModalData({msg: 'Delete product?', action: async () => { await fetch(DB_URL + 'products/' + key + '.json', { method: 'DELETE' }); fetchData(); showToastMsg('Deleted!'); }});}} style={{background:'#f64e60', color:'white', border:'none', padding:'6px 12px', borderRadius:'4px', cursor:'pointer', width:'100%'}}><i className="fas fa-trash"></i> Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {view === 'add-product-view' && (
          <div className="view-section active">
            <div className="card">
              <div className="card-header"><h3>Publish Product</h3></div>
              <form id="uploadForm" className="form-grid" onSubmit={handleAddProduct}>
                <div className="form-group"><label>Product Name</label><input type="text" id="p_name" required/></div>
                <div className="form-group"><label>Selling Price (₹)</label><input type="number" id="p_price" required/></div>
                <div className="form-group"><label>Discount (%)</label><input type="number" id="p_discount" placeholder="e.g. 20"/></div>
                <div className="form-group"><label>Coupon Code</label><input type="text" id="p_coupon" placeholder="e.g. RS178K"/></div>
                <div className="form-group full-width"><label>Payment Mode</label><select id="p_paymentMode"><option value="Both">COD & UPI Allowed</option><option value="UPI Only">UPI Only (Prepaid / No COD)</option></select></div>
                <div className="form-group"><label>Initial Stock</label><input type="number" id="p_stock" defaultValue="10"/></div>
                <div className="form-group"><label>Status</label><select id="p_status"><option value="Active">Active</option><option value="Out of Stock">Out of Stock</option></select></div>
                <div className="form-group full-width"><label>Product Images (Select up to 4)</label><div className="upload-area" onClick={()=>document.getElementById('p_images').click()}><i className="fas fa-images" style={{fontSize:'24px', color:'var(--primary)', marginBottom:'10px'}}></i><p>Tap here to browse files</p></div><input type="file" id="p_images" accept="image/*" multiple style={{display:'none'}} /></div>
                <div className="form-group full-width"><button type="submit" id="submitBtn" className="btn-primary" style={{width:'100%', padding:'15px', fontSize: '16px'}}>Publish to Live Website</button></div>
              </form>
            </div>
          </div>
        )}

        {view === 'orders-view' && (
          <div className="view-section active"><div className="card"><div className="card-header"><h3>Order Management</h3><button className="btn-primary" onClick={fetchData}>Refresh</button></div><div style={{overflowX: 'auto'}}><table><thead><tr><th>Customer</th><th>Items & Total</th><th>Status</th><th>Delivery</th></tr></thead><tbody>
            {Object.keys(orders).reverse().map(key => {
              const o = orders[key]; const sc = o.status === 'Pending' ? '#ffa800' : (o.status === 'Rejected' ? 'red' : '#1bc5bd');
              return (
                <tr key={key}>
                  <td><b>{o.customerName}</b><br/><span style={{fontSize:'11px', color:'#888'}}>{o.phone}</span></td>
                  <td>{o.items}<br/><b style={{color:'var(--primary)'}}>₹{o.totalAmount}</b></td>
                  <td><select value={o.status} onChange={(e) => updateOrder(key, 'status', e.target.value)} style={{padding:'5px', border:`1px solid ${sc}`, fontWeight:'bold', borderRadius:'4px', marginBottom:'5px'}}><option value="Pending">Pending</option><option value="Accepted">Accepted</option><option value="Shipped">Shipped</option><option value="Delivered">Delivered</option><option value="Rejected">Rejected</option></select></td>
                  <td><button onClick={() => viewFullOrder(key)} className="btn-primary" style={{fontSize:'11px', width:'100%', marginBottom:'5px', background:'#8950fc'}}><i className="fas fa-eye"></i> Show Details</button><input type="text" defaultValue={o.deliveryTime || ''} onBlur={(e) => updateOrder(key, 'deliveryTime', e.target.value)} style={{padding:'5px', width:'100%', marginBottom:'5px'}} placeholder="e.g. In 7 days"/><button onClick={() => updateOrder(key, 'save', '')} className="btn-primary" style={{fontSize:'11px', width:'100%'}}><i className="fas fa-save"></i> Save</button></td>
                </tr>
              );
            })}
          </tbody></table></div></div></div>
        )}

        {view === 'chat-view' && (
          <div className="view-section active"><div className="card" style={{marginBottom:0}}><div className="card-header"><h3>💬 Customer Support</h3><button className="btn-primary" onClick={fetchChatList}>Refresh</button></div><div className="chat-layout">
            <div className="chat-list">
              {Object.keys(chats).length === 0 ? <p style={{padding:'15px', color:'#888', textAlign:'center'}}>No active chats</p> : Object.keys(chats).map(uid => (
                <div key={uid} className={`chat-user-item ${activeChatUserId === uid ? 'active' : ''}`} onClick={() => {setActiveChatUserId(uid); fetchAdminMessages(uid);}}><b><i className="fas fa-user-circle"></i> {chats[uid].userName || 'Customer'}</b></div>
              ))}
            </div>
            <div className="chat-window">
              {activeChatUserId && <div className="chat-header-info"><div><h4 style={{margin:0, color:'var(--primary)'}}>{chats[activeChatUserId]?.userName}</h4></div></div>}
              <div className="chat-messages">{!activeChatUserId ? <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#888'}}>Select a customer</div> : Object.keys(chatMessages).map(k => {
                let m = chatMessages[k]; let isMe = m.sender === 'admin';
                return <div key={k} className={`msg-bubble ${isMe ? 'msg-admin' : 'msg-user'}`}>{m.text}</div>;
              })}{activeChatUserId && <div ref={chatEndRef} />}</div>
              {activeChatUserId && <div className="chat-input-area"><input type="text" value={adminChatInput} onChange={e=>setAdminChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') sendAdminMessage()}} placeholder="Type a message..." style={{flex:1, padding:'12px', borderRadius:'25px', border:'1px solid var(--border-color)', background:'var(--bg-color)', color:'var(--text-main)', outline:'none'}} /><button className="btn-primary" style={{borderRadius:'50%', width:'45px', height:'45px'}} onClick={sendAdminMessage}><i className="fas fa-paper-plane"></i></button></div>}
            </div>
          </div></div></div>
        )}

        {view === 'settings-view' && (
          <div className="view-section active">
            <div className="card"><div className="card-header"><h3>Admin Settings</h3></div><div className="form-grid">
              <div className="form-group full-width" style={{display:'flex', alignItems:'center', gap:'20px'}}><img src={settings.avatar} style={{width:'80px', height:'80px', borderRadius:'50%', objectFit:'cover', border:'3px solid var(--primary)'}} alt="" /><div><label>Upload Profile Picture</label><input type="file" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if(f){ const r = new FileReader(); r.onload=(ev)=>{setSettings({...settings, avatar: ev.target.result}); localStorage.setItem('rsAdminAvatar', ev.target.result); showToastMsg('Avatar updated');}; r.readAsDataURL(f); } }} style={{background:'transparent', border:'none', padding:0}} /></div></div>
              <div className="form-group full-width"><button className="btn-primary" onClick={()=>showToastMsg('Saved!', 'success')}>Save Store Configuration</button></div>
            </div></div>
            <div className="card" style={{marginTop:'20px', border:'1px solid #f64e60'}}><div className="card-header" style={{borderBottom:'1px solid rgba(246,78,96,0.2)'}}><h3 style={{color:'#f64e60'}}><i className="fas fa-exclamation-triangle"></i> Danger Zone: Wipe Data</h3></div><div className="form-grid">
              {!delPassState ? (
                <div className="form-group full-width"><label>Set Secure Deletion Password</label><div style={{display:'flex', gap:'10px'}}><input type="password" id="new-del-pass" placeholder="Create a deletion password"/><button className="btn-primary" onClick={()=>{const p=document.getElementById('new-del-pass').value; if(p){localStorage.setItem('rsDeletePassword', p); setDelPassState(true); showToastMsg('Password Set!');}}}>Save</button></div></div>
              ) : showResetDel ? (
                <div className="form-group full-width" style={{background:'rgba(246,78,96,0.05)', padding:'15px', borderRadius:'8px'}}><label style={{color:'#f64e60', fontWeight:'bold', marginBottom:'10px'}}>Reset Deletion Password</label><input type="text" id="r-u" placeholder="Admin Username" style={{marginBottom:'10px'}}/><input type="password" id="r-p" placeholder="Admin Login Password" style={{marginBottom:'10px'}}/><input type="password" id="r-n" placeholder="New Deletion Password" style={{marginBottom:'10px'}}/><button className="btn-primary" style={{background:'#f64e60'}} onClick={async ()=>{const u=document.getElementById('r-u').value, p=document.getElementById('r-p').value, n=document.getElementById('r-n').value; if(u==='Raizo250'&&p==='Raizo250'){localStorage.setItem('rsDeletePassword',n); showToastMsg('Reset!'); setShowResetDel(false);}else{const res=await fetch(DB_URL+'admins.json');const data=await res.json()||{}; if(Object.values(data).find(a=>a.username===u&&a.password===p)){localStorage.setItem('rsDeletePassword',n); showToastMsg('Reset!'); setShowResetDel(false);}else showToastMsg('Invalid Credentials', 'error');}}}>Reset</button><div style={{textAlign:'right', marginTop:'10px'}}><a href="#" onClick={(e)=>{e.preventDefault();setShowResetDel(false);}} style={{color:'#888', fontSize:'12px'}}>Cancel</a></div></div>
              ) : (
                <>
                  <div className="form-group full-width" style={{display:'flex', gap:'10px', flexWrap:'wrap'}}><button className="btn-primary" style={{background:'#ffa800', flex:1}} onClick={()=>{setModalType('delete-auth'); setModalData('orders');}}><i className="fas fa-trash"></i> Wipe Orders</button><button className="btn-primary" style={{background:'#8950fc', flex:1}} onClick={()=>{setModalType('delete-auth'); setModalData('users');}}><i className="fas fa-users-slash"></i> Wipe Customers</button><button className="btn-primary" style={{background:'#f64e60', flex:1}} onClick={()=>{setModalType('delete-auth'); setModalData('all');}}><i className="fas fa-skull-crossbones"></i> Factory Reset</button></div>
                  <div className="form-group full-width" style={{textAlign:'right', marginTop:'-10px'}}><a href="#" onClick={(e)=>{e.preventDefault();setShowResetDel(true);}} style={{color:'#888', fontSize:'12px', textDecoration:'underline'}}>Forgot Deletion Password?</a></div>
                </>
              )}
            </div></div>
          </div>
        )}
      </div>

      {modalType === 'order-details' && modalData && (() => {
        let matched = []; let itemNames = modalData.items.replace(/\[.*?\]/g, '').split(',').map(s=>s.trim().toLowerCase());
        Object.keys(products).forEach(k => { if(itemNames.some(i => i.includes(products[k].name.toLowerCase()))) matched.push(products[k]); });
        return (
          <div className="modal-overlay" style={{display:'flex'}}><div className="modal-content" style={{maxWidth:'500px'}}><div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid var(--border-color)', paddingBottom:'15px', marginBottom:'20px'}}><h2 style={{fontFamily:'Playfair Display', color:'var(--primary)'}}>📦 Shipping Details</h2><button onClick={()=>setModalType(null)} style={{background:'none', border:'none', fontSize:'24px', cursor:'pointer', color:'#f64e60'}}><i className="fas fa-times-circle"></i></button></div><div style={{fontSize:'15px', lineHeight:1.6}}>
            <div style={{background:'var(--input-bg)', padding:'15px', borderRadius:'8px', marginBottom:'15px', border:'1px solid var(--border-color)'}}><h4 style={{color:'var(--primary)', marginBottom:'10px'}}><i className="fas fa-user"></i> Customer Info</h4><p><b>Name:</b> {modalData.customerName}</p><p><b>Phone:</b> <a href={`tel:${modalData.phone}`} style={{color:'#3699ff', textDecoration:'none'}}>{modalData.phone}</a></p></div>
            <div style={{background:'var(--input-bg)', padding:'15px', borderRadius:'8px', marginBottom:'15px', border:'1px solid var(--border-color)'}}><h4 style={{color:'var(--primary)', marginBottom:'10px'}}><i className="fas fa-map-marker-alt"></i> Delivery Address</h4><p>{modalData.address}</p></div>
            <div style={{background:'var(--input-bg)', padding:'15px', borderRadius:'8px', marginBottom:'15px', border:'1px solid var(--border-color)'}}><h4 style={{color:'var(--primary)', marginBottom:'10px'}}><i className="fas fa-shopping-bag"></i> Order Summary</h4><p><b>Items:</b> {modalData.items}</p>
            {matched.length > 0 && <div style={{display:'flex', gap:'10px', marginTop:'10px', overflowX:'auto', paddingBottom:'5px'}}>{matched.map((p,i)=><div key={i} style={{textAlign:'center', minWidth:'70px'}}><a href={p.img} target="_blank" rel="noreferrer"><img src={p.img} style={{width:'60px', height:'60px', objectFit:'cover', borderRadius:'6px', border:'2px solid var(--primary)'}} alt=""/></a><p style={{fontSize:'10px', fontWeight:'bold', marginTop:'4px', maxWidth:'70px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.name}</p></div>)}</div>}
            <p style={{marginTop:'10px'}}><b>Total Amount:</b> ₹{modalData.totalAmount}</p><p><b>Payment Mode:</b> <span style={{background:'#333', color:'white', padding:'4px 8px', borderRadius:'4px', fontSize:'11px', textTransform:'uppercase'}}>{modalData.paymentType || 'COD'}</span></p></div>
            {modalData.paymentType === 'UPI' && modalData.upiScreenshot && <div style={{background:'var(--input-bg)', padding:'15px', borderRadius:'8px', marginBottom:'15px', border:'1px solid var(--border-color)', textAlign:'center'}}><h4 style={{color:'#6528F7', marginBottom:'10px'}}><i className="fas fa-receipt"></i> Payment Screenshot</h4><img src={modalData.upiScreenshot} style={{width:'100%', maxWidth:'250px', borderRadius:'8px', border:'2px solid #ddd', cursor:'pointer'}} onClick={()=>window.open(modalData.upiScreenshot)} alt=""/></div>}
            {modalData.status === 'Pending' && <button onClick={async ()=>{await updateOrder(modalData.id, 'status', 'Accepted'); setModalType(null);}} style={{width:'100%', padding:'15px', marginTop:'15px', background:'#1bc5bd', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', fontSize:'16px', cursor:'pointer'}}><i className="fas fa-check-circle"></i> Accept Order</button>}
          </div></div></div>
        );
      })()}

      {modalType === 'confirm' && modalData && (
        <div className="modal-overlay" style={{display:'flex'}}><div className="modal-content" style={{maxWidth:'350px', textAlign:'center'}}><div style={{fontSize:'40px', marginBottom:'15px'}}>🤔</div><h3 style={{marginBottom:'20px'}}>{modalData.msg}</h3><div style={{display:'flex', gap:'10px'}}><button className="btn-primary" style={{background:'#ccc', flex:1}} onClick={()=>setModalType(null)}>Cancel</button><button className="btn-primary" style={{background:'#f64e60', flex:1}} onClick={()=>{modalData.action(); setModalType(null);}}>Yes</button></div></div></div>
      )}

      {modalType === 'delete-auth' && (
        <div className="modal-overlay" style={{display:'flex'}}><div className="modal-content" style={{maxWidth:'350px', textAlign:'center'}}><div style={{fontSize:'40px', marginBottom:'15px'}}>⚠️</div><h3 style={{marginBottom:'15px', color:'#f64e60'}}>Confirm Deletion</h3><input type="password" id="delete-auth-pass" placeholder="Deletion Password" style={{width:'100%', padding:'12px', marginBottom:'15px', border:'1px solid var(--border-color)', borderRadius:'6px'}} /><div style={{display:'flex', gap:'10px'}}><button className="btn-primary" style={{background:'#ccc', flex:1}} onClick={()=>setModalType(null)}>Cancel</button><button className="btn-primary" style={{background:'#f64e60', flex:1}} onClick={handleDangerAction}>Wipe Data</button></div></div></div>
      )}

      <div className={`toast ${toast.show ? 'show' : ''} toast-${toast.type}`}><span>{toast.msg}</span></div>
    </>
  );
}
