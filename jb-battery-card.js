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

const simpleColors = {
  0: "#bf360c",
  15: "#ad6b0d",
  33: "#827717",
  66: "#1b5e20"
};

class JbBatteryCard extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.colorMap = colors;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define an entity");
    }

    const root = this.shadowRoot;
    root.innerHTML = "";

    const cardConfig = { ...config };
    if (!cardConfig.scale) cardConfig.scale = "50px";

    const entityParts = this._splitEntityAndAttribute(cardConfig.entity);
    cardConfig.entity = entityParts.entity;
    if (entityParts.attribute) cardConfig.attribute = entityParts.attribute;

    const card = document.createElement("ha-card");

    const style = document.createElement("style");
    style.textContent = `
      ha-card {
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-evenly;
        padding: 8% 0;
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
        line-height: 1.25;
      }

      #title {
        font-size: 0.9em;
        opacity: 0.85;
      }

      #value {
        font-size: 1.4em;
        font-weight: bold;
        white-space: nowrap;
      }
    `;

    card.innerHTML = `
      <ha-icon id="icon" icon="mdi:battery"></ha-icon>
      <div id="description">
        <div id="title"></div>
        <div id="value"></div>
      </div>
      <mwc-ripple></mwc-ripple>
    `;

    card.appendChild(style);

    card.addEventListener("click", () => {
      this._fire("hass-more-info", { entityId: cardConfig.entity });
    });

    root.appendChild(card);

    this._config = cardConfig;
  }

  _splitEntityAndAttribute(entity) {
    const parts = entity.split(".");
    if (parts.length < 3) return { entity };
    return { entity: parts.slice(0, -1).join("."), attribute: parts.at(-1) };
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
    const config = this._config;
    const root = this.shadowRoot;

    const stateObj = hass.states[config.entity];
    if (!stateObj) return;

    let rawValue = config.attribute
      ? stateObj.attributes[config.attribute]
      : stateObj.state;

    const numberValue = Number(rawValue);
    const isValidNumber = !Number.isNaN(numberValue);

    const unit = stateObj.attributes.unit_of_measurement || "";

    const displayValue = isValidNumber
      ? `${numberValue} ${unit}`.trim()
      : rawValue;

    root.getElementById("title").textContent =
      config.title || stateObj.attributes.friendly_name;

    root.getElementById("value").textContent = displayValue;

    const icon = root.getElementById("icon");
    if (isValidNumber) {
      icon.style.color = this._computeColor(numberValue);
    }

    root.lastChild.hass = hass;
  }

  _computeColor(value) {
    const keys = Object.keys(this.colorMap).map(Number).sort((a, b) => b - a);
    return this.colorMap[keys.find(k => value >= k)] || "#999";
  }

  getCardSize() {
    return 1;
  }
}

console.log("%c 🔋 jb-battery-card loaded ", "background:#222;color:#bada55");
customElements.define("jb-battery-card", JbBatteryCard);
