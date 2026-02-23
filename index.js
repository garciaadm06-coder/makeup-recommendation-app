const { ipcRenderer } = require('electron');

let selectedProduct = null;
let editIndex = null;

//NAVIGATION SECTION
function showHome(){ // Show home page
  document.getElementById("homeSection").style.display = "block";
  document.getElementById("cartSection").style.display = "none";
}

async function showCart(){ // Show cart page and load cart data
  document.getElementById("homeSection").style.display = "none";
  document.getElementById("cartSection").style.display = "block";
  loadCart();
}

//LOAD BRANDS FROM MAKEUP API
window.addEventListener("DOMContentLoaded", loadBrands);

function loadBrands(){

  const brandSelect = document.getElementById("brandSelect");

  fetch("https://makeup-api.herokuapp.com/api/v1/products.json")
  .then(res => res.json())
  .then(data => {

    const brands = [...new Set(
      data
      .map(item => item.brand)
      .filter(b => b)
    )].sort();

    brandSelect.innerHTML = "<option value=''>-- Choose Brand --</option>";

    brands.forEach(brand => {
      const option = document.createElement("option");
      option.value = brand;
      option.textContent = brand;
      brandSelect.appendChild(option);
    });

  })
  .catch(() => {
    brandSelect.innerHTML = "<option value=''>Error loading brands</option>";
  });
}

//SEARCH PRODUCTS
function searchProducts(){ // Get selected brand and user budget

  const brand = document.getElementById("brandSelect").value;
  const budgetValue = document.getElementById("budgetInput").value;
  const budget = budgetValue ? parseFloat(budgetValue) : null;

  if(!brand){
    alert("Please select a brand.");
    return;
  }

  const result = document.getElementById("productResult");
  result.innerHTML = "";

  fetch(`https://makeup-api.herokuapp.com/api/v1/products.json?brand=${brand}`)
  .then(res => res.json())
  .then(data => {

    data.slice(0,10).forEach(product => {

      const price = parseFloat(product.price);
      if(isNaN(price)) return;
      if(budget !== null && price > budget) return;

      const card = document.createElement("div");
      card.className = "productCard";

      card.innerHTML = `
        <h4>${product.name}</h4>
        <p>Brand: ${product.brand}</p>
        <p>Price: $${price}</p>
        <button>Add to Cart</button>
      `;

      card.querySelector("button")
      .addEventListener("click", function(){
        openModal(product.name, product.brand, price);
      });

      result.appendChild(card);
    });

  })
  .catch(() => alert("Error loading products."));
}

//MODAL (ADD OR EDIT PRODUCT)
function openModal(name, brand, price){

  selectedProduct = { name, brand, price };
  editIndex = null; // reset edit mode

  document.getElementById("modalProductName").innerText =
    name + " - $" + price;

  document.getElementById("modalQty").value = "";
  document.getElementById("modalNote").value = "";

  document.getElementById("addModal").style.display = "flex";

  document.getElementById("modalQty").focus();
}

function closeModal(){
  document.getElementById("addModal").style.display = "none";
}

//CONFIRM BUTTON
async function confirmAdd(){

  const qtyInput = document.getElementById("modalQty");
  const noteInput = document.getElementById("modalNote");

  const qty = parseInt(qtyInput.value);
  const note = noteInput.value;

  if(!qty || qty <= 0){
    alert("Please enter valid quantity.");
    return;
  }

  let cartData = await ipcRenderer.invoke('load-cart');

  if(editIndex !== null){
    // EDIT MODE
    cartData[editIndex].quantity = qty;
    cartData[editIndex].note = note;

    ipcRenderer.send('update-cart', cartData);

    showToast("Item updated successfully ✨");

  } else {
    // ADD MODE
    cartData.push({
      name: selectedProduct.name,
      brand: selectedProduct.brand,
      price: selectedProduct.price,
      quantity: qty,
      note: note
    });

    ipcRenderer.send('update-cart', cartData);

    showToast("Item added to bag 💖");
  }

  closeModal();
  loadCart();
}

//LOAD CART
async function loadCart(){

  const cartData = await ipcRenderer.invoke('load-cart');
  const cartResult = document.getElementById("cartResult");
  const totalPrice = document.getElementById("totalPrice");

  cartResult.innerHTML = "";

  if(!cartData || cartData.length === 0){
    cartResult.innerHTML = "<p>Your makeup bag is empty.</p>";
    totalPrice.innerText = "";
    return;
  }

  let total = 0;

  cartData.forEach((item, index) => {

    const subtotal = item.price * item.quantity;
    total += subtotal;

    const div = document.createElement("div");
    div.className = "productCard";

    div.innerHTML = `
      <h4>${item.name}</h4>
      <p>Brand: ${item.brand}</p>
      <p>Price: $${item.price}</p>
      <p>Qty: ${item.quantity}</p>
      <p>Note: ${item.note || "-"}</p>
      <p><strong>Subtotal: $${subtotal.toFixed(2)}</strong></p>
      <button onclick="editItem(${index})">Edit</button>
      <button onclick="deleteItem(${index})">Delete</button>
    `;

    cartResult.appendChild(div);
  });

  totalPrice.innerText = "Total: $" + total.toFixed(2);
}

//DELETE
async function deleteItem(index){ // Delete item based on index

  let cartData = await ipcRenderer.invoke('load-cart');
  cartData.splice(index,1);

  ipcRenderer.send('update-cart', cartData);

  showToast("Item deleted 🗑");

  loadCart();
}
//EDIT
async function editItem(index){ // Load selected item into modal for editing

  let cartData = await ipcRenderer.invoke('load-cart');
  const item = cartData[index];

  selectedProduct = {
    name: item.name,
    brand: item.brand,
    price: item.price
  };

  editIndex = index; //important

  document.getElementById("modalProductName").innerText =
    item.name + " - $" + item.price;

  document.getElementById("modalQty").value = item.quantity;
  document.getElementById("modalNote").value = item.note;

  document.getElementById("addModal").style.display = "flex";

  document.getElementById("modalQty").focus();
}

function showToast(message){

  const toast = document.getElementById("toast");
  toast.innerText = message;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}