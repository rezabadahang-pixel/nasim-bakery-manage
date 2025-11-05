// Nasim Bakery - app.js
// All logic in English. Uses non-blocking UI toast instead of many alerts.
// Uses click + pointer feedback safely for iPad.

(function () {
  // --- Utilities ---
  function $(q, el = document) { return el.querySelector(q); }
  function $all(q, el = document) { return Array.from(el.querySelectorAll(q)); }

  // Toast (non-blocking)
  const toastEl = $('#toast') || document.getElementById('toast');
  function showToast(msg, timeout = 2000) {
    if (!toastEl) return alert(msg);
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toastEl.style.display = 'none'; }, timeout);
  }

  // Safe storage helpers
  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
    catch (e) { return fallback; }
  }
  function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  // --- Data stores ---
  let breads = loadJSON('breads', []).filter(Boolean);
  let materials = loadJSON('materials', []).filter(m => m && m.name);
  let recipes = loadJSON('recipes', []);
  let sales = loadJSON('sales', []);

  // --- Page navigation ---
  const navButtons = $all('.nav-btn');
  const pages = $all('.page');
  let currentPageIndex = 0;

  function showPage(targetId) {
    pages.forEach(p => p.classList.remove('active'));
    const el = document.getElementById(targetId);
    if (el) {
      el.classList.add('active');
      currentPageIndex = pages.indexOf(el);
    }
  }

  // Attach nav (use click for actions; pointer feedback handled by CSS :active)
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.target));
  });

  // Swipe navigation (touch)
  (function attachSwipe() {
    let startX = 0;
    const area = document.getElementById('pages');
    if (!area) return;
    area.addEventListener('touchstart', e => startX = e.changedTouches[0].screenX);
    area.addEventListener('touchend', e => {
      const endX = e.changedTouches[0].screenX;
      const dist = endX - startX;
      if (dist < -60 && currentPageIndex < pages.length - 1) {
        showPage(pages[currentPageIndex + 1].id);
      } else if (dist > 60 && currentPageIndex > 0) {
        showPage(pages[currentPageIndex - 1].id);
      }
    });
  })();

  // --- Bread Management ---
  const breadInput = $('#breadName');
  const addBreadBtn = $('#addBreadBtn');
  const breadList = $('#breadList');
  const msgEl = $('#msg');

  function renderBreads() {
    breadList.innerHTML = '';
    breads.sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
    breads.forEach((b, i) => {
      const li = document.createElement('li');
      const span = document.createElement('span'); span.textContent = b;
      const edit = document.createElement('button'); edit.className = 'edit-btn'; edit.textContent = 'Edit';
      const del = document.createElement('button'); del.className = 'delete-btn'; del.textContent = 'Delete';
      li.appendChild(span);
      const right = document.createElement('div');
      right.appendChild(edit); right.appendChild(del);
      li.appendChild(right);
      breadList.appendChild(li);

      edit.addEventListener('click', () => {
        const newName = prompt('Edit bread name:', breads[i]);
        if (!newName) return;
        if (breads.some((x, idx) => x.toLowerCase() === newName.toLowerCase() && idx !== i)) {
          showToast('Already exists!');
          return;
        }
        breads[i] = newName;
        saveJSON('breads', breads);
        renderAll();
        showToast('Saved');
      });

      del.addEventListener('click', () => {
        if (!confirm(`Delete "${breads[i]}"?`)) return;
        breads.splice(i, 1);
        saveJSON('breads', breads);
        renderAll();
        showToast('Deleted');
      });
    });
  }

  addBreadBtn.addEventListener('click', () => {
    const name = (breadInput.value || '').trim();
    if (!name) { msgEl.textContent = 'Enter a name'; return; }
    if (breads.some(b => b.toLowerCase() === name.toLowerCase())) { msgEl.textContent = 'Already exists'; return; }
    breads.push(name);
    saveJSON('breads', breads);
    breadInput.value = ''; msgEl.textContent = '';
    renderAll();
    showToast('Bread added');
  });

  // --- Materials ---
  const matNameInput = $('#matName');
  const matPriceInput = $('#matPrice');
  const addMatBtn = $('#addMatBtn');
  const matTableBody = $('#matTable tbody');
  const matMsgEl = $('#matMsg');
  const searchMaterial = $('#searchMaterial');

  function renderMaterials() {
    matTableBody.innerHTML = '';
    materials.sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    materials.forEach((m, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${m.name}</td><td>${Number(m.price).toLocaleString()}</td><td></td>`;
      const actionsTd = tr.querySelector('td:last-child');
      const edit = document.createElement('button'); edit.className = 'edit-btn'; edit.textContent = 'Edit';
      const del = document.createElement('button'); del.className = 'delete-btn'; del.textContent = 'Delete';
      actionsTd.appendChild(edit); actionsTd.appendChild(del);
      matTableBody.appendChild(tr);

      edit.addEventListener('click', () => {
        const newPrice = prompt(`New price for ${m.name}:`, m.price);
        if (newPrice === null) return;
        const num = parseFloat(newPrice);
        if (isNaN(num) || num <= 0) return alert('Invalid');
        materials[i].price = num;
        saveJSON('materials', materials);
        renderAll();
        showToast('Price updated');
      });

      del.addEventListener('click', () => {
        if (!confirm(`Delete ${m.name}?`)) return;
        materials.splice(i, 1);
        saveJSON('materials', materials);
        renderAll();
        showToast('Material removed');
      });
    });
  }

  addMatBtn.addEventListener('click', () => {
    const name = (matNameInput.value || '').trim();
    const price = parseFloat(matPriceInput.value);
    if (!name || !price) { matMsgEl.textContent = 'Enter name & price'; return; }
    if (materials.some(m => m.name.toLowerCase() === name.toLowerCase())) { matMsgEl.textContent = 'Already exists'; return; }
    materials.push({ name, price });
    saveJSON('materials', materials);
    matNameInput.value = ''; matPriceInput.value = ''; matMsgEl.textContent = '';
    renderAll();
    showToast('Material added');
  });

  searchMaterial.addEventListener('input', function() {
    const filter = (this.value || '').toLowerCase();
    $all('#matTable tbody tr').forEach(row => {
      row.style.display = row.querySelector('td').textContent.toLowerCase().includes(filter) ? '' : 'none';
    });
  });

  // --- Recipes ---
  const recipeBread = $('#recipeBread');
  const recipeMaterial = $('#recipeMaterial');
  const recipeQty = $('#recipeQty');
  const addRecipeBtn = $('#addRecipeBtn');
  const recipeTableBody = $('#recipeTable tbody');

  function populateDropdowns() {
    recipeBread.innerHTML = '<option value="All">All</option>' + breads.map(b => `<option value="${b}">${b}</option>`).join('');
    recipeMaterial.innerHTML = materials.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
    $('#saleBreadSelect').innerHTML = breads.map(b => `<option value="${b}">${b}</option>`).join('');
    $('#recipeBread') && renderRecipes();
  }

  addRecipeBtn.addEventListener('click', () => {
    const bread = recipeBread.options[recipeBread.selectedIndex]?.value || '';
    const material = recipeMaterial.options[recipeMaterial.selectedIndex]?.value || '';
    const qty = parseFloat(recipeQty.value);
    if (!bread || bread === 'All') return showToast('Select a bread');
    if (!material || !qty) return showToast('Fill all fields');
    if (recipes.find(r => r.bread === bread && r.material === material)) return showToast('Material already exists for this bread');
    recipes.push({ bread, material, qty });
    saveJSON('recipes', recipes);
    recipeQty.value = '';
    const currentBread = bread;
    renderAll();
    recipeBread.value = currentBread;
    renderRecipes();
    showToast('Recipe added');
  });

  function renderRecipes() {
    const selected = recipeBread.value;
    recipeTableBody.innerHTML = '';
    recipes.filter(r => selected === 'All' || r.bread === selected).forEach((r, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.bread}</td><td>${r.material}</td><td>${r.qty.toLocaleString()}</td><td></td>`;
      const actionTd = tr.querySelector('td:last-child');
      const edit = document.createElement('button'); edit.className = 'edit-btn'; edit.textContent = 'Edit';
      const del = document.createElement('button'); del.className = 'delete-btn'; del.textContent = 'Delete';
      actionTd.appendChild(edit); actionTd.appendChild(del);
      recipeTableBody.appendChild(tr);

      edit.addEventListener('click', () => {
        const newQty = prompt('Enter new quantity:', r.qty);
        if (!newQty) return;
        recipes[i].qty = parseFloat(newQty);
        saveJSON('recipes', recipes);
        renderAll();
        showToast('Recipe updated');
      });

      del.addEventListener('click', () => {
        if (!confirm('Are you sure?')) return;
        recipes.splice(i, 1);
        saveJSON('recipes', recipes);
        renderAll();
        showToast('Deleted');
      });
    });
  }

  recipeBread.addEventListener('change', renderRecipes);

  // --- Cost calculation ---
  const breadCostSelect = $('#breadCostSelect');
  const costTableBody = $('#costTable tbody');

  function populateBreadCostDropdown() {
    breadCostSelect.innerHTML = '<option value="All">All</option>' + breads.map(b => `<option value="${b}">${b}</option>`).join('');
  }

  function calculateCostOfRecipe(breadName) {
    const items = recipes.filter(r => r.bread === breadName);
    let total = 0;
    items.forEach(i => {
      const mat = materials.find(m => m.name === i.material);
      if (mat) total += (i.qty / 1000) * parseFloat(mat.price);
    });
    return total;
  }

  function renderCostTable() {
    const selected = breadCostSelect.value;
    costTableBody.innerHTML = '';
    const breadsToShow = selected === 'All' ? breads : [selected];
    let breadCosts = loadJSON('breadCosts', {});
    breadsToShow.forEach(b => {
      const cost = calculateCostOfRecipe(b);
      const numBreads = 1;
      const costOne = Math.round(cost / numBreads);
      breadCosts[b] = costOne;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${b}</td><td>${cost.toLocaleString()}</td><td contenteditable="true" class="numBreads">${numBreads}</td><td class="costOneBread">${costOne.toLocaleString()}</td><td></td>`;
      const actionTd = tr.querySelector('td:last-child');
      const del = document.createElement('button'); del.className = 'delete-btn'; del.textContent = 'Delete';
      actionTd.appendChild(del);
      costTableBody.appendChild(tr);

      del.addEventListener('click', () => {
        if (!confirm(`Delete "${b}" from cost list?`)) return;
        delete breadCosts[b];
        saveJSON('breadCosts', breadCosts);
        breads = breads.filter(item => item !== b);
        saveJSON('breads', breads);
        renderAll();
        showToast('Removed');
      });

      tr.querySelector('.numBreads').addEventListener('input', e => {
        let num = parseFloat(e.target.textContent) || 1;
        const newCost = Math.round(cost / num);
        tr.querySelector('.costOneBread').textContent = newCost.toLocaleString();
        breadCosts[b] = newCost;
        saveJSON('breadCosts', breadCosts);
      });
    });
    saveJSON('breadCosts', breadCosts);
  }

  breadCostSelect.addEventListener('change', renderCostTable);

  // --- Sales ---
  const saleBreadSelect = $('#saleBreadSelect');
  const saleTableBody = $('#saleTable tbody');
  const totalSalesCell = $('#totalSales');
  const printInvoiceBtn = $('#printInvoiceBtn');
  const clearSalesBtn = $('#clearSalesBtn');
  const customerNameInput = $('#customerName');

  function populateSaleDropdown() {
    saleBreadSelect.innerHTML = breads.map(b => `<option value="${b}">${b}</option>`).join('');
  }

  function updateTotalSales() {
    const total = sales.reduce((acc, s) => {
      const costOne = loadJSON('breadCosts', {})[s.bread] || 0;
      return acc + (costOne * (1 + s.benefit / 100)) * s.num;
    }, 0);
    totalSalesCell.textContent = total.toLocaleString();
  }

  function renderSales() {
    saleTableBody.innerHTML = '';
    sales.forEach((s, i) => {
      const tr = document.createElement('tr');
      const costOne = loadJSON('breadCosts', {})[s.bread] || 0;
      const saleRate = (costOne * (1 + s.benefit / 100)) * s.num;
      tr.innerHTML = `<td>${s.bread}</td><td contenteditable="true" class="benefit">${s.benefit}</td><td contenteditable="true" class="num">${s.num}</td><td class="saleRate">${saleRate.toLocaleString()}</td><td></td>`;
      const actionTd = tr.querySelector('td:last-child');
      const del = document.createElement('button'); del.className = 'delete-btn'; del.textContent = 'Delete';
      actionTd.appendChild(del);
      saleTableBody.appendChild(tr);

      tr.querySelector('.benefit').addEventListener('input', e => {
        s.benefit = parseFloat(e.target.textContent) || 0;
        tr.querySelector('.saleRate').textContent = (loadJSON('breadCosts', {})[s.bread] * (1 + s.benefit / 100) * s.num).toLocaleString();
        updateTotalSales();
        saveJSON('sales', sales);
      });

      tr.querySelector('.num').addEventListener('input', e => {
        s.num = parseInt(e.target.textContent) || 0;
        tr.querySelector('.saleRate').textContent = (loadJSON('breadCosts', {})[s.bread] * (1 + s.benefit / 100) * s.num).toLocaleString();
        updateTotalSales();
        saveJSON('sales', sales);
      });

      del.addEventListener('click', () => {
        sales.splice(i, 1);
        saveJSON('sales', sales);
        renderSales();
        showToast('Sale removed');
      });
    });
    updateTotalSales();
  }

  saleBreadSelect.addEventListener('input', () => {
    const bread = saleBreadSelect.options[saleBreadSelect.selectedIndex]?.value || "";
    const costOne = loadJSON('breadCosts', {})[bread] || 0;
    const benefit = 100;
    const num = 1;
    sales.push({ bread, benefit, num });
    saveJSON('sales', sales);
    renderSales();
    showToast('Added to sales');
  });

  printInvoiceBtn.addEventListener('click', () => {
    const customerName = (customerNameInput.value || '').trim() || "Unknown Customer";
    const total = totalSalesCell.textContent;
    const now = new Date();
    const persianDate = now.toLocaleDateString('fa-IR').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    let invoiceHTML = `<div style="text-align:center;font-family:Segoe UI,Tahoma;"><h2>Nasim Bakery</h2><p><b>Customer:</b> ${customerName}</p><p><b>Date:</b> ${persianDate}</p><table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;margin-top:10px;"><tr style="background:#f0f0f0;"><th>Bread</th><th>Number</th><th>Sale Rate</th></tr>`;
    sales.forEach(s => {
      const costOne = loadJSON('breadCosts', {})[s.bread] || 0;
      const saleRate = (costOne * (1 + s.benefit / 100)) * s.num;
      invoiceHTML += `<tr><td>${s.bread}</td><td>${s.num}</td><td>${saleRate.toLocaleString()}</td></tr>`;
    });
    invoiceHTML += `<tr><td colspan="2" style="text-align:right;"><b>Total:</b></td><td><b>${total}</b></td></tr></table></div>`;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>Invoice</title></head><body>${invoiceHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  });

  clearSalesBtn.addEventListener('click', () => {
    if (!confirm('Are you sure you want to clear all sales?')) return;
    sales = [];
    saveJSON('sales', sales);
    renderSales();
    totalSalesCell.textContent = '0';
    customerNameInput.value = '';
    showToast('Sales cleared');
  });

  // --- Import/Export ---
  const importBtn = $('#importBreadBtn');
  const exportBtn = $('#exportBtn');
  const importText = $('#importBread');
  const exportData = $('#exportData');

  exportBtn.addEventListener('click', () => {
    const data = { breads, materials, recipes, sales };
    exportData.textContent = JSON.stringify(data, null, 2);
    showToast('Export prepared');
  });

  importBtn.addEventListener('click', () => {
    try {
      const data = JSON.parse(importText.value);
      if (data.breads) breads = data.breads;
      if (data.materials) materials = data.materials;
      if (data.recipes) recipes = data.recipes;
      if (data.sales) sales = data.sales;
      saveJSON('breads', breads); saveJSON('materials', materials); saveJSON('recipes', recipes); saveJSON('sales', sales);
      renderAll();
      showToast('Imported successfully');
    } catch (e) {
      showToast('Invalid JSON');
    }
  });

  // --- JsonBin Integration (replace keys before use) ---
  const JSONBIN_API_KEY = '$2a$10$6OcoOp76VA5GbO0qvmWNUeRrQyCY60X.b7xxK31WS/nhiwlrbcQZa'; // <-- PUT YOUR KEY HERE (do NOT store secret keys client-side for production)
  const JSONBIN_BIN_ID = '68f614a4d0ea881f40ae2556';  // <-- PUT YOUR BIN ID HERE

  const uploadBtn = $('#uploadJsonBinBtn');
  const downloadBtn = $('#downloadJsonBinBtn');

  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      const data = { breads, materials, recipes, sales };
      if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) return showToast('Set JSONBin keys in app.js');
      try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_API_KEY
          },
          body: JSON.stringify(data)
        });
        if (res.ok) showToast('Uploaded to jsonbin');
        else showToast('Upload failed');
      } catch (err) { console.error(err); showToast('Upload error'); }
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) return showToast('Set JSONBin keys in app.js');
      try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
          headers: { 'X-Master-Key': JSONBIN_API_KEY }
        });
        const json = await res.json();
        const data = json.record;
        if (data.breads) breads = data.breads;
        if (data.materials) materials = data.materials;
        if (data.recipes) recipes = data.recipes;
        if (data.sales) sales = data.sales;
        saveJSON('breads', breads); saveJSON('materials', materials); saveJSON('recipes', recipes); saveJSON('sales', sales);
        renderAll();
        showToast('Downloaded from jsonbin');
      } catch (err) { console.error(err); showToast('Download error'); }
    });
  }

  // --- Render everything helper ---
  function renderAll() {
    renderBreads();
    renderMaterials();
    populateDropdowns();
    renderRecipes();
    populateBreadCostDropdown();
    renderCostTable();
    populateSaleDropdown();
    renderSales();
  }

  // Initial render
  populateDropdowns();
  renderAll();

  // --- Service worker registration ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {
        console.warn('Service worker registration failed');
      });
    });
  }

  // Expose for debugging in console
  window.nasimBakery = { breads, materials, recipes, sales, renderAll };
})();
