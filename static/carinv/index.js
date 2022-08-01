var db = new PouchDB('https://lloydrochester.com/couch/inventory');
var inventory;
var requirements;
loadCards();
function loadCards() {
  db.get('car')
    .then(function(doc) {
      inventory = doc.inventory;
      inventory.sort(function(a,b) { return a.car > b.car })
      requirements = doc.requirements;
      updateInventoryTable();
    }).catch(function(err) {
      console.error(err);
    });
}

function updateInventoryTable() {
    var tableBody = document.getElementById("inventory");

    // Reset the table
    tableBody.innerHTML = "";

    // Build the new table
    inventory.forEach(function(inv) {
        var newRow = document.createElement("tr");
        tableBody.appendChild(newRow);

        insertCell(newRow,inv.car);
        insertCell(newRow,inv.item);
        insertCell(newRow,inv.manufacturer);
        insertCell(newRow,inv.model);
        insertCell(newRow,inv.partno);
        insertCell(newRow,inv.quantity);
    });
}

function insertCell(row,data) {
  var cell = document.createElement("td");
  cell.textContent = data;
  row.appendChild(cell);
}
