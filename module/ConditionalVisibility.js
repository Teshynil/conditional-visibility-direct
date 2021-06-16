import { ConditionalVisibilitySystem5e } from "./systems/ConditionalVisibilitySystem5e.js";
import { ConditionalVisibilitySystemPf2e } from "./systems/ConditionalVisibilitySystemPf2e.js";
import { DefaultConditionalVisibilitySystem } from "./systems/DefaultConditionalVisibilitySystem.js";
import * as Constants from "./Constants.js";
import { ConditionalVisibilityFacadeImpl } from "./ConditionalVisibilityFacade.js";
import { MODULE_NAME } from "./Constants.js";
export class ConditionalVisibility {
    /**
     * Create a ConditionalVisibility with a given sightLayer and tokenHud.
     * @param sightLayer the sightLayer to use
     * @param tokenHud the tokenHud to use
     */
    constructor(sightLayer, tokenHud) {
        this._conditionalVisibilitySystem = ConditionalVisibility.newSystem();
        console.log(Constants.MODULE_NAME + " | starting against v0.7 or greater instance " + game.data.version);
        this._getSrcTokens = () => {
            let srcTokens = new Array();
            if (this._sightLayer.sources) {
                for (const key of this._sightLayer.sources.keys()) {
                    if (key.startsWith("Token.")) {
                        const tok = canvas.tokens.placeables.find(tok => tok.id === key.substring("Token.".length));
                        if (tok) {
                            srcTokens.push(tok);
                        }
                    }
                }
            }
            else {
                if (game.user.isGM === false) {
                    srcTokens = game.user.character.getActiveTokens();
                }
            }
            return srcTokens;
        };
        this._draw = async () => {
            await this._sightLayer.initialize();
            await this._sightLayer.refresh();
        };
        ConditionalVisibility.canSee = (token) => {
            return this._conditionalVisibilitySystem.canSee(token, this._capabilities);
        };
        this._sightLayer = sightLayer;
        const realRestrictVisibility = sightLayer.restrictVisibility;
        this._sightLayer.restrictVisibility = () => {
            this._capabilities = this._conditionalVisibilitySystem.getVisionCapabilities(this._getSrcTokens());
            realRestrictVisibility.call(this._sightLayer);
            const restricted = canvas.tokens.placeables.filter(token => token.visible);
            if (restricted && restricted.length > 0) {
                let srcTokens = this._getSrcTokens();
                if (srcTokens.length > 0) {
                    const flags = this._conditionalVisibilitySystem.getVisionCapabilities(srcTokens);
                    for (let t of restricted) {
                        if (srcTokens.indexOf(t) < 0) {
                            t.visible = this._conditionalVisibilitySystem.canSee(t, flags);
                        }
                    }
                }
            }
        };
        const realTestVisiblity = sightLayer.testVisibility;
        this._sightLayer.testVisibility = (point, options) => {
            return realTestVisiblity.call(this._sightLayer, point, options);
        };
        this._tokenHud = tokenHud;
        this._conditionalVisibilitySystem.initializeOnToggleEffect(this._tokenHud);
        game.socket.on("modifyEmbeddedDocument", async (message) => {
            const result = message.result.some(result => {
                var _a, _b;
                return ((_a = result === null || result === void 0 ? void 0 : result.flags) === null || _a === void 0 ? void 0 : _a[Constants.MODULE_NAME]) || ((_b = result === null || result === void 0 ? void 0 : result.actorData) === null || _b === void 0 ? void 0 : _b.effects) !== undefined;
            });
            if (result) {
                await this.draw();
            }
        });
        // update sight layer, as custom decisons will not be executed the
        // first time through, and cannot be forced in setup
        this.draw();
        const popupVersion = game.settings.get(MODULE_NAME, "popup-version");
        const currentVersion = game.modules.get(MODULE_NAME).data.version === "@tagVersion@" ? "0.0.9" : game.modules.get(MODULE_NAME).data.version;
        if (this.isSemvarGreater(currentVersion, popupVersion)) {
            renderTemplate("modules/conditional-visibility/templates/version_popup.html", {
                version: currentVersion,
            }).then(content => {
                let d = new Dialog({
                    title: "Conditional Visibility",
                    content: content,
                    buttons: {
                        one: {
                            icon: '<i class="fas fa-check"></i>',
                            label: game.i18n.localize('CONVIS.popup.dismissuntilupdated'),
                            callback: () => game.settings.set(MODULE_NAME, 'popup-version', currentVersion)
                        },
                        two: {
                            icon: '<i class="fas fa-times"></i>',
                            label: game.i18n.localize('CONVIS.popup.close')
                        }
                    }
                });
                d.render(true);
            });
        }
    }
    /**
     * Called from init hook to establish the extra status effects in the main list before full game initialization.
     */
    static onInit() {
        const system = ConditionalVisibility.newSystem();
        const realIsVisible = Object.getOwnPropertyDescriptor(Token.prototype, 'isVisible').get;
        Object.defineProperty(Token.prototype, "isVisible", {
            get: function () {
                const isVisible = realIsVisible.call(this);
                if (isVisible === false) {
                    return false;
                }
                if (game.user.isGM || this.owner || !canvas.sight.tokenVision) {
                    return true;
                }
                return ConditionalVisibility.canSee(this);
            }
        });
        system.initializeStatusEffects();
    }
    isSemvarGreater(first, second) {
        const firstSemVar = this.splitOnDot(first);
        const secondSemVar = this.splitOnDot(second);
        if (firstSemVar.length != secondSemVar.length) {
            throw new Error("bad semvar first " + first + ", second" + second);
        }
        for (let i = 0; i < firstSemVar.length; i++) {
            if (firstSemVar[i] > secondSemVar[i]) {
                return true;
            }
        }
        return false;
    }
    splitOnDot(toSplit) {
        return toSplit.split(".").map(str => isNaN(Number(str)) ? 0 : Number(str));
    }
    /**
     * A static method that will be replaced after initialization with the appropriate system specific method.
     * @param token the token to test
     */
    static canSee(token) {
        return false;
    }
    /**
     * Create a new ConditionalVisibilitySystem appropriate to the game system
     * @returns ConditionalVisibilitySystem
     */
    static newSystem() {
        let system;
        switch (game.system.id) {
            case 'dnd5e':
                system = new ConditionalVisibilitySystem5e();
                break;
            case 'pf2e':
                system = new ConditionalVisibilitySystemPf2e();
                break;
            default:
                system = new DefaultConditionalVisibilitySystem();
        }
        return system;
    }
    /**
     * Initializes the ConditionalVisibilitySystem.  Called from ready Hook.
     * @param sightLayer the slightlayer from the game system.
     * @param tokenHud the tokenHud to use.
     */
    static initialize(sightLayer, tokenHud) {
        ConditionalVisibility.INSTANCE = new ConditionalVisibility(sightLayer, tokenHud);
        const facade = new ConditionalVisibilityFacadeImpl(ConditionalVisibility.INSTANCE, ConditionalVisibility.INSTANCE._conditionalVisibilitySystem);
        //@ts-ignore
        window.ConditionalVisibility = facade;
        ConditionalVisibility.INSTANCE._conditionalVisibilitySystem.initializeHooks(facade);
    }
    onRenderTokenConfig(tokenConfig, jQuery, data) {
        const visionTab = $('div.tab[data-tab="vision"]');
        renderTemplate("modules/conditional-visibility/templates/extra_senses.html", tokenConfig.object.data.flags[Constants.MODULE_NAME] || {})
            .then(extraSenses => {
            visionTab.append(extraSenses);
        });
    }
    onRenderTokenHUD(app, html, data) {
        const systemEffects = this._conditionalVisibilitySystem.effectsByIcon();
        html.find("img.effect-control")
            .each((idx, icon) => {
            const src = icon.attributes.src.value;
            if (systemEffects.has(src)) {
                let title;
                if (systemEffects.get(src).visibilityId === 'hidden') {
                    //@ts-ignore
                    title = game.i18n.localize(systemEffects.get(src).label);
                    if (data.flags && data.flags[Constants.MODULE_NAME]
                        && data.flags[Constants.MODULE_NAME]._ste && !isNaN(parseInt(data.flags[Constants.MODULE_NAME]._ste))) {
                        //@ts-ignore
                        title += ' ' + game.i18n.localize('CONVIS.currentstealth') + ': ' + data.flags[Constants.MODULE_NAME]._ste;
                    }
                }
                else {
                    //@ts-ignore
                    title = game.i18n.localize(systemEffects.get(src).label);
                }
                icon.setAttribute("title", title);
            }
        });
    }
    onPreCreateActiveEffect(actor, effect, options, userId) {
        const status = this._conditionalVisibilitySystem.getEffectByIcon(effect);
        if (status) {
            actor.setFlag(Constants.MODULE_NAME, status.visibilityId, true);
        }
    }
    onPreDeleteActiveEffect(actor, effect, options, userId) {
        const status = this._conditionalVisibilitySystem.getEffectByIcon(effect);
        if (status) {
            actor.unsetFlag(Constants.MODULE_NAME, status.visibilityId);
        }
    }
    onPreUpdateToken(scene, token, update, options, userId) {
        var _a, _b;
        const effectsFromUpdate = this._conditionalVisibilitySystem.effectsFromUpdate(update);
        if (effectsFromUpdate) {
            let convis = {};
            this._conditionalVisibilitySystem.effectsByCondition().forEach((value, key) => {
                convis[key] = false;
            });
            //TODO- figure out active effects for this?
            effectsFromUpdate.forEach(effect => {
                const status = this._conditionalVisibilitySystem.getEffectByIcon(effect);
                if (status) {
                    //effect.changeType = "add";
                    //effect.changes = [{
                    //@ts-ignore
                    //    key: "data.data.convis." + status.id, value: true, mode: ACTIVE_EFFECT_MODES.OVERWRITE
                    //}]
                    convis[status.visibilityId] = true;
                }
            });
            if (!update.flags) {
                update.flags = {};
            }
            if (convis.hidden !== true) {
                convis._ste = null;
            }
            else {
                if ((_b = (_a = token.flags) === null || _a === void 0 ? void 0 : _a[MODULE_NAME]) === null || _b === void 0 ? void 0 : _b._ste) {
                    convis._ste = token.flags[MODULE_NAME]._ste;
                }
            }
            if (update.flags[MODULE_NAME] === undefined) {
                update.flags[MODULE_NAME] = convis;
            }
            this.draw().then(() => { });
        }
        else if (update.flags && update.flags[MODULE_NAME]) {
            this.draw().then(() => { });
        }
    }
    async draw() {
        this._draw();
    }
}
