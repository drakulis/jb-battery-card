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
            throw new Error("Please define entity");
        }

        const root = this.shadowRoot;
        if (root.lastChild) root.removeChild(root.lastChild);

        const cardConfig = Object.assign({}, config);
        if (!cardConfig.scale) cardConfig.scale = "50px";

        // Entity 1
        const entityParts = this._splitEntityAndAttribute(cardConfig.entity);
        cardConfig.entity = entityParts.entity;
        if (entityParts.attribute) cardConfig.attribute1 = entityParts.attribute;

        // Optionaler Wert 1 (Entladeleistung)
        if (!cardConfig.value1_entity) cardConfig.value1_entity = null;
        if (!cardConfig.value1_unit) cardConfig.value1_unit = '';

        // Entity 2 (optional)
        let entity2Parts = null;
        if (cardConfig.entity2) {
            entity2Parts = this._splitEntityAndAttribute(cardConfig.entity2);
            cardConfig.entity2 = entity2Parts.entity;
            if (entity2Parts.attribute) cardConfig.attribute2 = entity2Parts.attribute;

            if (!cardConfig.value2_entity) cardConfig.value2_entity = null;
            if (!cardConfig.value2_unit) cardConfig.value2_unit = '';
        }

        const card = document.createElement("ha-card");
        card.setAttribute("id", "card");
        card.setAttribute("aria-label", cardConfig.title || "");

        // Dynamische Icon-Größe: 1 Batterie → 40%, 2 Batterien → 80%
        const iconSize = cardConfig.entity2 ? '80%' : '40%';

        const style = document.createElement("style");
        style.textContent = `
          ha-card {
            --base-unit: ${cardConfig.scale};
            cursor: pointer;
            display: flex;
            flex-direction: ${cardConfig.horizontal === false ? 'column' : 'row'};
            align-items: center;
            text-align: center;
            padding: 4% 0px;
            font-size: 16.8px;
            box-sizing: border-box;
            justify-content: space-evenly;
            height: 100%;
          }
            
          ha-icon {
              width: ${iconSize};
              height: auto;
              --mdc-icon-size: 100%;
          }
          
          .battery-block {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin: 0 10px;
          }

          .extra-value {
              font-size: 0.9em;
              color: var(--primary-text-color);
              margin: 2px 0;
          }
        `;

        // HTML mit optionalen Titeln und extra Wert
        card.innerHTML = `
        <div class="battery-block" id="battery1">
            <ha-icon id="icon1" icon="mdi:battery"></ha-icon>
            <div id="description1">
                ${cardConfig.title1 ? `<span id="title1">${cardConfig.title1}</span>` : ''}
                <span class="extra-value" id="value1"></span>
                <span id="percent1">-</span>
            </div>
        </div>
        ${cardConfig.entity2 ? `
        <div class="battery-block" id="battery2">
            <ha-icon id="icon2" icon="mdi:battery"></ha-icon>
            <div id="description2">
                ${cardConfig.title2 ? `<span id="title2">${cardConfig.title2}</span>` : ''}
                <span class="extra-value" id="value2"></span>
                <span id="percent2">-</span>
            </div>
        </div>` : ''}
        <mwc-ripple></mwc-ripple>
        `;

        card.appendChild(style);

        // Klick auf Batterie 1
        card.querySelector("#battery1").addEventListener("click", event => {
            this._fire("hass-more-info", { entityId: cardConfig.entity });
        });

        // Klick auf Batterie 2
        if (cardConfig.entity2) {
            card.querySelector("#battery2").addEventListener("click", event => {
                this._fire("hass-more-info", { entityId: cardConfig.entity2 });
            });
        }

        root.appendChild(card);

        // Farbskala
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
        let colorLevels = Object.keys(this.colorMap).sort((a,b) => b-a);
        let key = colorLevels.find(key => numberValue >= key);
        return this.colorMap[key];
    }

    _computeBatteryIconSimple(value, state) {
        let statePart = (state === "charging" || state === "full") ? "-charging" : "";
        let level = +value;
        if (level <= 15) return `mdi:battery${statePart}-outline`;
        if (level <= 45) return `mdi:battery${statePart}-low`;
        if (level <= 80) return `mdi:battery${statePart}-medium`;
        return `mdi:battery${statePart}-high`;
    }

    _computeBatteryIconDetailed(value, state) {
        let statePart = (state === "charging" || state === "full") ? "-charging" : "";
        let numberValue = +value;
        let level = Math.round(numberValue / 10) * 10;
        if (level == 0) return `mdi:battery${statePart}-outline`;
        if (level < 100) return `mdi:battery${statePart}-${level}`;
        return (state === "charging" || state === "full") ? `mdi:battery-charging-100` : `mdi:battery${statePart}`;
    }

    _computeBatteryIcon(value, state) {
        if (this._config.variant == "simple") return this._computeBatteryIconSimple(value, state);
        return this._computeBatteryIconDetailed(value, state);
    }

    _getEntityStateValue(entity, attribute) {
        if (!entity) return null;
        if (!attribute) return entity.state;
        return entity.attributes ? entity.attributes[attribute] : null;
    }

    set hass(hass) {
        const root = this.shadowRoot;
        const config = this._config;

        // --- Batterie 1 ---
        const entityState1Raw = this._getEntityStateValue(hass.states[config.entity], config.attribute1);
        const entityState1 = entityState1Raw !== null ? parseInt(entityState1Raw, 10) : '-';
        const statusEntityState1 = this._getEntityStateValue(hass.states[config.entity], config.status_attribute1);
        root.getElementById("percent1").textContent = `${entityState1}%`;
        root.getElementById("icon1").setAttribute("icon", this._computeBatteryIcon(entityState1, statusEntityState1));
        root.getElementById("icon1").style.color = this._computeColor(entityState1);

        if (config.value1_entity) {
            const value1 = this._getEntityStateValue(hass.states[config.value1_entity]);
            root.getElementById("value1").textContent = (value1 !== null && value1 !== undefined) 
                ? `${Math.round(value1)} ${config.value1_unit || ''}` 
                : '';
        }

        // --- Batterie 2 ---
        if (config.entity2) {
            const entityState2Raw = this._getEntityStateValue(hass.states[config.entity2], config.attribute2);
            const entityState2 = entityState2Raw !== null ? parseInt(entityState2Raw, 10) : '-';
            const statusEntityState2 = this._getEntityStateValue(hass.states[config.entity2], config.status_attribute2);
            root.getElementById("percent2").textContent = `${entityState2}%`;
            root.getElementById("icon2").setAttribute("icon", this._computeBatteryIcon(entityState2, statusEntityState2));
            root.getElementById("icon2").style.color = this._computeColor(entityState2);

            if (config.value2_entity) {
                const value2 = this._getEntityStateValue(hass.states[config.value2_entity]);
                root.getElementById("value2").textContent = (value2 !== null && value2 !== undefined) 
                    ? `${Math.round(value2)} ${config.value2_unit || ''}` 
                    : '';
            }
        }

        root.lastChild.hass = hass;
    }

    getCardSize() {
        return 1;
    }
}

console.log("%c 🪫 jb-battery-card (2 Sensors + optional value + unit, integer display) ", "background: #222; color: #bada55");
customElements.define("jb-battery-card", JbBatteryCard);
