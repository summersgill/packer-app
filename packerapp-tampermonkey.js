// ==UserScript==
// @name         PackerApp — Mintsoft Auto Capture
// @namespace    packerapp
// @version      1.5
// @description  Automatically logs dispatched orders to PackerApp when picking is complete
// @author       You
// @match        https://om.mintsoft.co.uk/Picking/ScanActions/*
// @grant        GM_xmlhttpRequest
// @connect      script.google.com
// @connect      script.googleusercontent.com
// ==/UserScript==

(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxQ1kdPb7oyOnu9XCEDz6shxpQjkfe_xf2G5fUld5ockctorgtz28RwzT54dzMmuz-X/exec';
  const USER_LABEL      = 'MINTSOFT';
  // ────────────────────────────────────────────────────────

  // Extract order ID from URL path: /Picking/ScanActions/2054010
  const match = window.location.pathname.match(/\/Picking\/ScanActions\/(\d+)/);
  if (!match) return;

  const orderId = match[1];
  const storageKey = `packerapp_sent_${orderId}`;
  const alreadySentThisSession = sessionStorage.getItem(storageKey);

  // Already written this session — warn loudly, do not write again
  if (alreadySentThisSession === 'ok') {
    showDuplicateSessionModal(orderId);
    return;
  }

  // Show checking indicator immediately
  showToast(`⟳ Checking order ${orderId}…`, '#2a6ebb', 99999);

  const timestamp = new Date().toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  const url = APPS_SCRIPT_URL
    + '?timestamp=' + encodeURIComponent(timestamp)
    + '&user='      + encodeURIComponent(USER_LABEL)
    + '&barcode='   + encodeURIComponent(orderId);

  GM_xmlhttpRequest({
    method: 'GET',
    url: url,
    onload: function (response) {
      clearToasts();
      try {
        const json = JSON.parse(response.responseText);
        if (json.status === 'ok') {
          // Mark as successfully written so reloads don't write again
          sessionStorage.setItem(storageKey, 'ok');
          showToast(`✓ Order ${orderId} logged — parcel leaving warehouse`, '#007a3d', 5000);
        } else if (json.status === 'duplicate') {
          // Don't set sessionStorage — let them see the duplicate warning every time
          showDuplicateModal(orderId, json.timestamp, json.user);
        } else {
          showToast(`✗ PackerApp error: ${json.message}`, '#cc2244', 8000);
        }
      } catch {
        showToast('✗ PackerApp: unexpected response — check sheet manually', '#cc2244', 8000);
      }
    },
    onerror: function () {
      clearToasts();
      showToast('✗ PackerApp: could not connect — check internet connection', '#cc2244', 8000);
    }
  });

  // ── TOAST ────────────────────────────────────────────────
  function showToast(message, colour, duration) {
    clearToasts();
    const toast = document.createElement('div');
    toast.className = 'packerapp-toast';
    Object.assign(toast.style, {
      position:     'fixed',
      bottom:       '28px',
      right:        '28px',
      background:   colour,
      color:        '#fff',
      padding:      '14px 22px',
      borderRadius: '10px',
      fontFamily:   'sans-serif',
      fontSize:     '16px',
      fontWeight:   'bold',
      zIndex:       '999999',
      boxShadow:    '0 6px 20px rgba(0,0,0,0.4)',
      maxWidth:     '360px',
      lineHeight:   '1.4',
    });
    toast.textContent = message;
    document.body.appendChild(toast);
    if (duration < 99999) {
      setTimeout(() => {
        toast.style.transition = 'opacity 0.5s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
      }, duration);
    }
  }

  function clearToasts() {
    document.querySelectorAll('.packerapp-toast').forEach(t => t.remove());
  }

  // ── DUPLICATE MODAL ──────────────────────────────────────
  function showDuplicateModal(orderId, timestamp, user) {
    const overlay = document.createElement('div');
    overlay.id = 'packerapp-overlay';
    Object.assign(overlay.style, {
      position:       'fixed',
      inset:          '0',
      background:     'rgba(0,0,0,0.80)',
      zIndex:         '9999999',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
    });

    overlay.innerHTML = `
      <div style="
        background: #fff;
        border-radius: 14px;
        padding: 36px 40px;
        max-width: 400px;
        width: 92%;
        text-align: center;
        box-shadow: 0 16px 48px rgba(0,0,0,0.5);
        font-family: sans-serif;
        animation: packerapp-pop 0.2s ease;
        border-top: 6px solid #cc2244;
      ">
        <style>
          @keyframes packerapp-pop {
            from { transform: scale(0.88); opacity: 0; }
            to   { transform: scale(1);    opacity: 1; }
          }
        </style>

        <div style="font-size: 52px; margin-bottom: 10px;">🚨</div>

        <div style="
          font-size: 24px; font-weight: 900;
          color: #cc2244; margin-bottom: 8px;
          letter-spacing: 0.03em; text-transform: uppercase;
        ">
          Duplicate Despatch!
        </div>

        <div style="
          font-size: 15px; color: #333;
          margin-bottom: 6px; font-weight: 600; line-height: 1.5;
        ">
          Order <span style="
            background: #fce8ec;
            border-radius: 5px;
            padding: 2px 10px;
            font-family: monospace;
            font-size: 17px;
            color: #cc2244;
          ">${orderId}</span><br>has already been scanned out of the warehouse.
        </div>

        <div style="
          font-size: 15px; font-weight: 800;
          color: #cc2244; margin: 12px 0;
          padding: 10px;
          background: #fce8ec;
          border-radius: 8px;
        ">
          ⚠ Do NOT despatch — investigate before proceeding!
        </div>

        <div style="
          background: #f5f5f5;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 24px;
          font-size: 13px;
          color: #555;
          line-height: 1.9;
          text-align: left;
        ">
          📅 First scanned: <strong style="color:#222">${timestamp}</strong><br>
          👤 Scanned by: <strong style="color:#222">${user}</strong>
        </div>

        <button id="packerapp-ok" style="
          background: #cc2244;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 14px 44px;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          width: 100%;
        ">
          I Understand — Investigate Order
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('packerapp-ok').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });
  }

  // ── SAME SESSION DUPLICATE MODAL ────────────────────────
  function showDuplicateSessionModal(orderId) {
    const overlay = document.createElement('div');
    overlay.id = 'packerapp-session-overlay';
    Object.assign(overlay.style, {
      position:       'fixed',
      inset:          '0',
      background:     'rgba(0,0,0,0.80)',
      zIndex:         '9999999',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
    });

    overlay.innerHTML = `
      <div style="
        background: #fff;
        border-radius: 14px;
        padding: 36px 40px;
        max-width: 400px;
        width: 92%;
        text-align: center;
        box-shadow: 0 16px 48px rgba(0,0,0,0.5);
        font-family: sans-serif;
        animation: packerapp-pop 0.2s ease;
        border-top: 6px solid #e67e00;
      ">
        <style>
          @keyframes packerapp-pop {
            from { transform: scale(0.88); opacity: 0; }
            to   { transform: scale(1);    opacity: 1; }
          }
        </style>

        <div style="font-size: 52px; margin-bottom: 10px;">⚠️</div>

        <div style="
          font-size: 24px; font-weight: 900;
          color: #e67e00; margin-bottom: 10px;
          letter-spacing: 0.03em; text-transform: uppercase;
        ">
          Already Scanned!
        </div>

        <div style="
          font-size: 15px; color: #333;
          margin-bottom: 12px; font-weight: 600; line-height: 1.6;
        ">
          Order <span style="
            background: #fff3e0;
            border-radius: 5px;
            padding: 2px 10px;
            font-family: monospace;
            font-size: 17px;
            color: #e67e00;
          ">${orderId}</span><br>
          was already scanned out during this session.
        </div>

        <div style="
          font-size: 14px; font-weight: 800;
          color: #e67e00; margin: 12px 0;
          padding: 10px;
          background: #fff3e0;
          border-radius: 8px;
          line-height: 1.5;
        ">
          This order has already been logged today.<br>
          Do not despatch a second time.
        </div>

        <button id="packerapp-session-ok" style="
          background: #e67e00;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 14px 44px;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          width: 100%;
          margin-top: 8px;
        ">
          OK — Do Not Despatch Again
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('packerapp-session-ok').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });
  }

})();
