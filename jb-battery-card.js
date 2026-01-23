const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace")
);

const colors = {
  0: "#bf360c",
  10: "#c04807",
  20: "#ab5c10",
  30: "#ad6b0d",
  40: "#827717",
  60: "#33691e",
  80: "#1b5e20"
};

class JbBatteryCard extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define an entity");
    }

    this._config = config;
    this.shadowRoot.innerHTML = "";

    const card = document.createElement("ha-card");

    const style = document.createElement("style");
    style.textContent = `
      ha-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-evenly;
        padding: 10% 0;
        text-align: center;
        height: 100%;
      }

      ha-icon {
        width: 40%;
        --mdc-icon-size: 100%;
      }

      #description {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      #title {
        font-size: 0.9em;
        opacity: 0.85;
      }

      #value {
        font-size: 1.4em;
        font-weight: bold;
        display: block;
      }
    `;

    card.innerHTML = `
      <ha-icon id="icon" icon="mdi:flash"></ha-icon>
      <div id="description">
        <div id="title"></div>
        <div id="value"></div>
      </div>
      <mwc-ripple></mwc-ripple>
    `;

    card.appendChild(style);

    card.addEventListener("click", () => {
      this._fire("hass-more-info", { entityId: config.entity });
    });

    this.shadowRoot.appendChild(card);
  }

  _fire(type, detail) {
    const event = new Event(type, {
      bubbles: true,
      composed: true
    });
    event.detail = detail;
    this.shadowRoot.dispatchEvent(event);
  }

  set hass(hass) {
    const root = this.shadowRoot;
    const config = this._config;
    const stateObj = hass.states[config.entity];
    if (!stateObj) return;

    const raw = config.attribute
      ? stateObj.attributes[config.attribute]
      : stateObj.state;

    const unit = stateObj.attributes.unit_of_measurement || "";
    const valueText = `${raw} ${unit}`.trim();

    // 🔴 ERZWUNGENER REFLOW (entscheidend!)
    const valueEl = root.getElementById("value");
    valueEl.textContent = "";
    valueEl.offsetHeight; // <-- zwingt Browser zum Reflow
    valueEl.textContent = valueText;

    root.getElementById("title").textContent =
      config.title || stateObj.attributes.friendly_name;

    // Icon & Farbe nur wenn Zahl
    const num = Number(raw);
    if (!Number.isNaN(num)) {
      root.getElementById("icon").style.color = this._computeColor(num);
    }

    root.lastChild.hass = hass;
  }

  _computeColor(value) {
    const keys = Object.keys(colors).map(Number).sort((a, b) => b - a);
    return colors[keys.find(k => value >= k)] || "#999";
  }

  getCardSize() {
    return 1;
  }
}

console.log("%c ⚡ jb-battery-card READY ", "background:#222;color:#bada55");
customElements.define("jb-battery-card", JbBatteryCard);
