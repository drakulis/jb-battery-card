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
        if (root.lastChild) root.removeChild(root.lastChild);

        const cardConfig = Object.assign({}, config);
        if (!cardConfig.scale) cardConfig.scale = "50px";

        const entityParts = this._splitEntityAndAttribute(cardConfig.entity);
        const statusEntityParts = this._splitEntityAndAttribute(cardConfig.entity.replace("_level", "_state"));
        cardConfig.entity = entityParts.entity;
        cardConfig.status_entity = statusEntityParts.entity;

        if (entityParts.attribute) cardConfig.attribute = entityParts.attribute;
        if (statusEntityParts.attribute) cardConfig.status_attribute = statusEntityParts.attribute;

        const card = document.createElement("ha-card");
        card.setAttribute("id", "card");
        card.setAttribute("aria-label", cardConfig.title);

        if (cardConfig.horizontal === true) {
            card.classList.add("horizontal");
        }

        const style = document.createElement("style");
        style.textContent = `
      
          ha-card {
            --base-unit: ${cardConfig.scale};
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 4% 0px;
            font-size: 16.8px;
            box-sizing: border-box;
            justify-content: center;
            justify-content: space-evenly;
            position: relative;
            overflow: hidden;
            height: 100%;
          }
            
          ha-icon {
              width: 40%;
              height: auto;
              --mdc-icon-size: 100%;
          }
          
          #description {
              display: flex;
              flex-direction: column;
          }
          
          ha-card.horizontal {
            flex-direction: row;
            justify-content: space-evenly;
          }
        `;

        card.innerHTML = `
        <ha-icon id="icon" icon="mdi:battery" style="margin-right: 0px"></ha-icon>
        <div id="description">
            <span id="title"></span> <span id="percent"></span>
        </div>
        <mwc-ripple></mwc-ripple>
        `;

        card.appendChild(style);
        card.addEventListener("click", event => {
            this._fire("hass-more-info", { entityId: cardConfig.entity });
        });

        root.appendChild(card);

        if (cardConfig.colors) {
            this.colorMap = cardConfig.colors;
        } else if (cardConfig.variant == "simple") {
            this.colorMap = simpleColors;
        } else {
            this.colorMap = colors;
        }

        this._config = cardConfig;
    }

    _splitEntityAndAttribute(entity) {
        let parts = entity.split(".");
        if (parts.length < 3) {
            return { entity: entity };
        }

        return { attribute: parts.pop(), entity: parts.join(".") };
    }

    _fire(type, detail, options) {
        const node = this.shadowRoot;
        options = options || {};
        detail = (detail === null || detail === undefined) ? {} : detail;
        const event = new Event(type, {
            bubbles: options.bubbles === undefined ? true : options.bubbles,
            cancelable: Boolean(options.cancelable),
            composed: options.composed === undefined ? true : options.composed
        });
        event.detail = detail;
        node.dispatchEvent(event);
        return event;
    }

    _computeColor(stateValue) {
        let numberValue = Number(stateValue);
        let colorLevels = Object.keys(this.colorMap).sort().reverse();
        let key = colorLevels.find(key => {
            if (numberValue >= key) {
                return key;
            }
        });
        return this.colorMap[key];
    }

    _computeBatteryIconSimple(value, state) {
        let statePart = "";
        if (state === "charging" || state === "full") {
            statePart = "-charging";
        }
        
        let level = +value;
        if (level <= 15) {
            return `mdi:battery${statePart}-outline`;
        } else if (level <= 45) {
            return `mdi:battery${statePart}-low`;
        } else if (level <= 80) {
            return `mdi:battery${statePart}-medium`;
        } else if (level > 80) {
            return `mdi:battery${statePart}-high`;
        } else {
            return `mdi:battery${statePart}`;
        }
    }

    _computeBatteryIconDetailed(value, state) {
        let statePart = "";
        if (state === "charging" || state === "full") {
            statePart = "-charging";
        }

        let numberValue = +value;
        let level = Math.round(numberValue / 10) * 10;
        if (level == 0) {
            return `mdi:battery${statePart}-outline`;
        } else if (level < 100) {
            return `mdi:battery${statePart}-${level}`;
        } else {
            if (state === "charging" || state === "full") {
                return `mdi:battery-charging-100`;
            } else {
                return `mdi:battery${statePart}`;
            }
        }
    }

    _computeBatteryIcon(value, state) {
        if (this._config.variant == "simple") {
            return this._computeBatteryIconSimple(value, state);
        }
        return this._computeBatteryIconDetailed(value, state);
    }

    _getEntityStateValue(entity, attribute) {
        if (!attribute) {
            return entity.state;
        }

        return entity.attributes[attribute];
    }

    set hass(hass) {
        const root = this.shadowRoot;

        const config = this._config;
        const entityState = parseInt(this._getEntityStateValue(hass.states[config.entity], config.attribute), 10) || '-';
        const statusEntityState = this._getEntityStateValue(hass.states[config.status_entity], config.status_attribute);

        const changed = statusEntityState !== this._statusEntityState || entityState !== this._entityState;

        if (entityState !== this._entityState) {
            root.getElementById("percent").textContent = `${entityState}%`;
            root.getElementById("title").textContent = config.title;
            this._entityState = entityState;
        }

        if (changed) {
            root.getElementById("icon").setAttribute("icon", this._computeBatteryIcon(this._entityState, statusEntityState));
            root.getElementById("icon").style.color = this._computeColor(this._entityState);
            this._statusEntityState = statusEntityState;
        }

        root.lastChild.hass = hass;
    }

    getCardSize() {
        return 1;
    }
}

console.log("%c 🪫 jb-batter-card ", "background: #222; color: #bada55");
customElements.define("jb-battery-card", JbBatteryCard);
