const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace")
);

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
        justify-content: center;
        padding: 12% 0;
        text-align: center;
        height: 100%;
      }

      ha-icon {
        width: 40%;
        --mdc-icon-size: 100%;
        margin-bottom: 6px;
      }

      #text {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }

      .line {
        display: block;
        width: 100%;
      }

      #title {
        font-size: 0.9em;
        opacity: 0.8;
      }

      #value {
        font-size: 1.4em;
        font-weight: bold;
      }
    `;

    card.innerHTML = `
      <ha-icon id="icon" icon="mdi:battery"></ha-icon>

      <div id="text">
        <div id="title" class="line"></div>
        <div id="value" class="line"></div>
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
    const ev = new Event(type, { bubbles: true, composed: true });
    ev.detail = detail;
    this.shadowRoot.dispatchEvent(ev);
  }

  set hass(hass) {
    const cfg = this._config;
    const root = this.shadowRoot;
    const stateObj = hass.states[cfg.entity];
    if (!stateObj) return;

    const raw = cfg.attribute
      ? stateObj.attributes[cfg.attribute]
      : stateObj.state;

    const unit = stateObj.attributes.unit_of_measurement || "";
    const valueText = `${raw} ${unit}`.trim();

    // 🔒 JEDER WERT EIGENE ZEILE – KEIN INLINE MEHR
    root.getElementById("title").textContent =
      cfg.title || stateObj.attributes.friendly_name;

    root.getElementById("value").textContent = valueText;

    root.lastChild.hass = hass;
  }

  getCardSize() {
    return 1;
  }
}

customElements.define("jb-battery-card", JbBatteryCard);
