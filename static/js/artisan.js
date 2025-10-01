const authToken = localStorage.getItem('authToken');
const userData = JSON.parse(localStorage.getItem('userData') || '{}');

if (!authToken || userData.role !== 'artisan') {
    window.location.href = '/';
}

document.getElementById('userName').textContent = userData.full_name || '';

async function showUploadProduct() {
    alert('Product upload feature coming soon!');
}
