const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;

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
    this.colorMap = colors;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define an entity");
    }

    const root = this.shadowRoot;
    root.innerHTML = "";

    const cardConfig = { ...config };

    const entityParts = this._splitEntityAndAttribute(cardConfig.entity);
    const statusEntityParts =
      this._splitEntityAndAttribute(cardConfig.entity.replace("_level", "_state"));

    cardConfig.entity = entityParts.entity;
    cardConfig.status_entity = statusEntityParts.entity;

    if (entityParts.attribute) cardConfig.attribute = entityParts.attribute;
    if (statusEntityParts.attribute) cardConfig.status_attribute = statusEntityParts.attribute;

    this._config = cardConfig;

    const card = document.createElement("ha-card");

    const style = document.createElement("style");
    style.textContent = `
      ha-card {
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
        gap: 2px;
      }

      #title,
      #value,
      #soc {
        display: block;
        width: 100%;
      }

      #value,
      #soc {
        font-weight: bold;
      }
    `;

    card.innerHTML = `
      <ha-icon id="icon" icon="mdi:battery"></ha-icon>

      <div id="description">
        <div id="title"></div>
        <div id="value"></div>
        <div id="soc"></div>
      </div>

      <mwc-ripple></mwc-ripple>
    `;

    card.appendChild(style);

    card.addEventListener("click", () => {
      this._fire("hass-more-info", { entityId: cardConfig.entity });
    });

    root.appendChild(card);
  }

  _splitEntityAndAttribute(entity) {
    const parts = entity.split(".");
    if (parts.length < 3) return { entity };
    return { entity: parts.slice(0, -1).join("."), attribute: parts.at(-1) };
  }

  _fire(type, detail) {
    const ev = new Event(type, { bubbles: true, composed: true });
    ev.detail = detail;
    this.shadowRoot.dispatchEvent(ev);
  }

  _getEntityStateValue(entity, attribute) {
    return attribute ? entity.attributes[attribute] : entity.state;
  }

  set hass(hass) {
    const root = this.shadowRoot;
    const cfg = this._config;

    const valueEntity = hass.states[cfg.entity];
    const statusEntity = hass.states[cfg.status_entity];
    if (!valueEntity || !statusEntity) return;

    const valueRaw = this._getEntityStateValue(valueEntity, cfg.attribute);
    const unit = valueEntity.attributes.unit_of_measurement || "";
    const valueText = `${valueRaw} ${unit}`.trim();

    const socRaw =
      this._getEntityStateValue(statusEntity, cfg.status_attribute);

    root.getElementById("title").textContent = cfg.title;
    root.getElementById("value").textContent = valueText;
    root.getElementById("soc").textContent = `${socRaw} %`;

    const num = Number(socRaw);
    if (!Number.isNaN(num)) {
      const icon = root.getElementById("icon");
      icon.style.color = this._computeColor(num);
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

customElements.define("jb-battery-card", JbBatteryCard);
