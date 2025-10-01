const authToken = localStorage.getItem('authToken');
const userData = JSON.parse(localStorage.getItem('userData') || '{}');

if (!authToken || userData.role !== 'admin') {
    window.location.href = '/';
}

async function loadStats() {
    try {
        const response = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const stats = await response.json();
        
        const grid = document.getElementById('statsGrid');
        grid.innerHTML = `
            <div class="card"><h3>Total Artisans</h3><p>${stats.total_artisans}</p></div>
            <div class="card"><h3>Total Buyers</h3><p>${stats.total_buyers}</p></div>
            <div class="card"><h3>Total Products</h3><p>${stats.total_products}</p></div>
            <div class="card"><h3>Total Orders</h3><p>${stats.total_orders}</p></div>
            <div class="card"><h3>Total Revenue</h3><p>$${stats.total_revenue.toFixed(2)}</p></div>
            <div class="card"><h3>Artisan Earnings</h3><p>$${stats.artisan_earnings.toFixed(2)}</p></div>
        `;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

loadStats();
