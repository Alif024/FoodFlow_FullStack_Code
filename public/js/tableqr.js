document.addEventListener("DOMContentLoaded", function () {
  const genForm = document.getElementById("tableQRGenForm");
  const createForm = document.getElementById("tableCreateForm");
  const tableSelect = document.getElementById("tableSelect");
  const tableNameInput = document.getElementById("tableNameInput");
  const createBtn = document.getElementById("tableCreateBtn");
  const generateBtn = document.getElementById("tableQRGenerateBtn");
  const dropBtn = document.getElementById("tableDropBtn");
  const qrPreview = document.getElementById("qrPreview");
  const qrLink = document.getElementById("qrLink");
  const statusEl = document.getElementById("tableQRStatus");

  if (!genForm || !tableSelect) return;

  function setStatus(message, isError) {
    if (!statusEl) return;
    if (!message) {
      statusEl.textContent = "";
      statusEl.classList.add("hidden");
      return;
    }
    statusEl.textContent = message;
    statusEl.classList.remove("hidden");
    statusEl.style.color = isError ? "#ff8f99" : "";
  }

  async function readApiResponse(response, fallbackMessage) {
    const raw = await response.text();
    let payload = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch (_err) {
        const snippet = raw.slice(0, 120).replace(/\s+/g, " ").trim();
        throw new Error(`${fallbackMessage} (non-JSON response: ${snippet || "empty"})`);
      }
    }
    if (!response.ok) {
      throw new Error(payload?.error || fallbackMessage);
    }
    return payload;
  }

  function renderTableOptions(rows, selectedValue) {
    tableSelect.innerHTML = "";
    if (!Array.isArray(rows) || rows.length === 0) {
      tableSelect.innerHTML = '<option value="">No tables found</option>';
      tableSelect.disabled = true;
      return;
    }

    tableSelect.disabled = false;
    rows.forEach((table) => {
      const option = document.createElement("option");
      option.value = String(table.table_id);
      option.textContent = `${table.table_id} - ${table.table_name || `Table ${table.table_id}`}`;
      if (selectedValue && String(selectedValue) === String(table.table_id)) {
        option.selected = true;
      }
      tableSelect.appendChild(option);
    });
  }

  async function loadTables(selectedValue) {
    tableSelect.innerHTML = '<option value="">Loading tables...</option>';
    tableSelect.disabled = true;
    try {
      const response = await fetch("/api/tables", { cache: "no-store" });
      const rows = await readApiResponse(response, "Failed to load tables");
      renderTableOptions(rows, selectedValue);
    } catch (err) {
      tableSelect.innerHTML = '<option value="">Failed to load tables</option>';
      tableSelect.disabled = true;
      console.error("Failed to load tables", err);
      setStatus(`Failed to load tables: ${err.message}`, true);
    }
  }

  if (createForm) {
    createForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const tableName = (tableNameInput?.value || "").trim();
      if (createBtn) {
        createBtn.disabled = true;
        createBtn.textContent = "Adding...";
      }
      setStatus("");

      try {
        const response = await fetch("/api/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table_name: tableName || null,
            status: "open",
          }),
        });
        const payload = await readApiResponse(response, "Failed to add table");

        const createdId = payload?.table_id;
        await loadTables(createdId);
        if (tableNameInput) tableNameInput.value = "";
        setStatus(`Added table #${createdId} (${payload.table_name || `Table ${createdId}`})`, false);
      } catch (err) {
        console.error(err);
        setStatus(`Failed to add table: ${err.message}`, true);
      } finally {
        if (createBtn) {
          createBtn.disabled = false;
          createBtn.textContent = "Add Table";
        }
      }
    });
  }

  genForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const tableId = Number(tableSelect.value);
    if (!tableId) {
      setStatus("Please select a table.", true);
      return;
    }

    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.textContent = "Generating...";
    }
    setStatus("");

    try {
      const response = await fetch("/api/tableqr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: tableId }),
      });
      const data = await readApiResponse(response, "Failed to generate QR");

      const qr = data.qr;
      qrPreview.innerHTML = `<img src="${qr.qrImageUrl}" alt="QR code for table ${tableId}">`;
      qrLink.href = qr.qrData;
      qrLink.textContent = qr.qrData;
      setStatus(`QR generated for table #${tableId}`, false);
    } catch (err) {
      console.error(err);
      setStatus(`Failed to generate QR: ${err.message}`, true);
    } finally {
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate QR";
      }
    }
  });

  if (dropBtn) {
    dropBtn.addEventListener("click", async function () {
      const tableId = Number(tableSelect.value);
      if (!tableId) {
        setStatus("Please select a table to drop.", true);
        return;
      }

      const sure = window.confirm(`Drop table #${tableId}? This will remove related QR records for this table.`);
      if (!sure) return;

      dropBtn.disabled = true;
      const previousText = dropBtn.textContent;
      dropBtn.textContent = "Dropping...";
      setStatus("");

      try {
        const response = await fetch(`/api/tables/${tableId}`, { method: "DELETE" });
        await readApiResponse(response, "Failed to drop table");
        await loadTables();
        qrPreview.innerHTML = "";
        qrLink.href = "#";
        qrLink.textContent = "";
        setStatus(`Dropped table #${tableId}`, false);
      } catch (err) {
        console.error(err);
        setStatus(`Failed to drop table: ${err.message}`, true);
      } finally {
        dropBtn.disabled = false;
        dropBtn.textContent = previousText || "Drop Selected Table";
      }
    });
  }

  loadTables();
});
