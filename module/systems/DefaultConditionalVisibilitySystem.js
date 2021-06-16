import { MODULE_NAME } from "../Constants.js";
import * as Constants from "../Constants.js";
/**
 * The DefaultConditionalVisibilitySystem, to use when no visibility system can be found for the game system.
 */
export class DefaultConditionalVisibilitySystem {
    constructor() {
        //yes, this is a BiMap but the solid TS BiMap implementaiton is GPLv3, so we will just fake what we need here
        this._effectsByIcon = new Map();
        this._effectsByCondition = new Map();
        this.effects().forEach(statusEffect => {
            this._effectsByIcon.set(statusEffect.icon, statusEffect);
            this._effectsByCondition.set(statusEffect.visibilityId, statusEffect);
        });
    }
    hasStatus(token, id, icon) {
        var _a, _b, _c, _d, _e, _f, _g;
        return token.data.actorLink ? ((_d = (_c = (_b = (_a = token.actor) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.flags) === null || _c === void 0 ? void 0 : _c[MODULE_NAME]) === null || _d === void 0 ? void 0 : _d[id]) === true : ((_g = (_f = (_e = token.data) === null || _e === void 0 ? void 0 : _e.flags) === null || _f === void 0 ? void 0 : _f[MODULE_NAME]) === null || _g === void 0 ? void 0 : _g[id]) === true;
    }
    gameSystemId() {
        return "default";
    }
    /**
     * Base effects are invisible, obscured, and indarkness
     */
    effects() {
        return DefaultConditionalVisibilitySystem.BASE_EFFECTS;
    }
    effectsByIcon() {
        return this._effectsByIcon;
    }
    effectsByCondition() {
        return this._effectsByCondition;
    }
    effectsFromUpdate(update) {
        var _a;
        return (_a = update.actorData) === null || _a === void 0 ? void 0 : _a.effects;
    }
    getEffectByIcon(effect) {
        //@ts-ignore
        return this.effectsByIcon().get(effect.icon);
    }
    initializeStatusEffects() {
        console.log(Constants.MODULE_NAME + " | Initializing visibility system effects " + this.gameSystemId() + " for game system " + game.system.id);
        this.effectsByIcon().forEach((value, key) => {
            //@ts-ignore
            CONFIG.statusEffects.push({
                id: value.id,
                label: value.label,
                icon: value.icon
            });
        });
    }
    /**
     * For subclasses to set up systsem specific hooks.
     * @todo unify initializeOnToggleEffect if possible
     */
    initializeHooks(facade) {
    }
    /**
     * Default system does not have any reaction to a condition change.  Subclasses override this to add behavior.
     * @param tokenHud the tokenHud to use
     */
    initializeOnToggleEffect(tokenHud) {
    }
    getVisionCapabilities(srcTokens) {
        const flags = {};
        flags.seeinvisible = srcTokens.some(sTok => {
            return sTok.data.flags[Constants.MODULE_NAME] &&
                (sTok.data.flags[Constants.MODULE_NAME].seeinvisible === true
                    || sTok.data.flags[Constants.MODULE_NAME].blindsight === true
                    || sTok.data.flags[Constants.MODULE_NAME].tremorsense === true
                    || sTok.data.flags[Constants.MODULE_NAME].truesight === true);
        });
        flags.seeobscured = srcTokens.some(sTok => {
            return sTok.data.flags[Constants.MODULE_NAME] &&
                (sTok.data.flags[Constants.MODULE_NAME].blindsight === true
                    || sTok.data.flags[Constants.MODULE_NAME].tremorsense === true);
        });
        flags.seeindarkness = srcTokens.some(sTok => {
            return sTok.data.flags[Constants.MODULE_NAME] &&
                (sTok.data.flags[Constants.MODULE_NAME].blindsight === true
                    || sTok.data.flags[Constants.MODULE_NAME].devilssight === true
                    || sTok.data.flags[Constants.MODULE_NAME].tremorsense === true
                    || sTok.data.flags[Constants.MODULE_NAME].truesight === true);
        });
        return flags;
    }
    /**
     * The base method comparing the capability flags from the sightLayer with the conditions of the token.
     * @param target the token whose visibility is being checked
     * @param flags the capabilities established by the sight layer
     */
    canSee(target, visionCapabilities) {
        if (this.seeInvisible(target, visionCapabilities) === false) {
            return false;
        }
        if (this.seeObscured(target, visionCapabilities) === false) {
            return false;
        }
        if (this.seeInDarkness(target, visionCapabilities) === false) {
            return false;
        }
        if (this.seeContested(target, visionCapabilities) === false) {
            return false;
        }
        return true;
    }
    /**
     * Tests whether a token is invisible, and if it can be seen.
     * @param target the token being seen (or not)
     * @param effects the effects of that token
     * @param visionCapabilities the sight capabilities of the sight layer
     */
    seeInvisible(target, visionCapabilities) {
        const invisible = this.hasStatus(target, 'invisible', 'unknown.svg');
        if (invisible === true) {
            if (visionCapabilities.seeinvisible !== true) {
                return false;
            }
        }
        return true;
    }
    /**
     * Tests whether a token is obscured, and if it can be seen.
     * @param target the token being seen (or not)
     * @param visionCapabilities the sight capabilities of the sight layer
     */
    seeObscured(target, visionCapabilities) {
        const obscured = this.hasStatus(target, 'obscured', 'foggy.svg');
        if (obscured === true) {
            if (visionCapabilities.seeobscured !== true) {
                return false;
            }
        }
        return true;
    }
    /**
     * Tests whether a token is in darkness, and if it can be seen.
     * @param target the token being seen (or not)
     * @param effects the effects of that token
     * @param flags the sight capabilities of the sight layer
     */
    seeInDarkness(target, visionCapabilities) {
        const indarkness = this.hasStatus(target, 'indarkness', 'moon.svg');
        if (indarkness === true) {
            if (visionCapabilities.seeindarkness !== true) {
                return false;
            }
        }
        return true;
    }
    /**
     * Tests whether a token has some contested (hidden) condition, and if it can be seen.  The most likely
     * candidate to be overridden by sublass systems.
     * @param target the token being seen (or not)
     * @param effects the effects of that token
     * @param visionCapabilities the sight capabilities of the sight layer
     */
    seeContested(target, flags) {
        return true;
    }
    hasStealth() {
        return false;
    }
    /**
     * Roll for the contested hiding check; override in subclass systems
     * @param token the token whose stats may create the roll.
     * @return a Roll
     */
    rollStealth(token) {
        return new Roll("1d20");
    }
    /**
     * Renders a dialog window pre-filled with the result of a system-dependent roll, which can be changed in an input field.  Subclasses can use this
     * as is, see ConditionalVisibilitySystem5e for an example
     * @param token the actor to whom this dialog refers
     * @returns a Promise<number> containing the value of the result, or -1 if unintelligble
     */
    async stealthHud(token) {
        let initialValue;
        try {
            initialValue = parseInt(token.data.flags[Constants.MODULE_NAME]._ste);
        }
        catch (err) {
        }
        let result = initialValue;
        if (initialValue === undefined || isNaN(parseInt(initialValue))) {
            try {
                result = this.rollStealth(token).roll().total;
            }
            catch (err) {
                console.warn("Error rolling stealth, check formula for system");
                result = Constants.DEFAULT_STEALTH;
            }
        }
        const content = await renderTemplate("modules/conditional-visibility/templates/stealth_hud.html", { initialValue: result });
        return new Promise((resolve, reject) => {
            let hud = new Dialog({
                title: game.i18n.localize('CONVIS.hidden'),
                content: content,
                buttons: {
                    one: {
                        icon: '<i class="fas fa-check"></i>',
                        label: 'OK',
                        callback: (html) => {
                            //@ts-ignore
                            const val = parseInt(html.find('div.form-group').children()[1].value);
                            if (isNaN(val)) {
                                resolve(-1);
                            }
                            else {
                                resolve(val);
                            }
                        }
                    }
                },
                close: (html) => {
                    //@ts-ignore
                    const val = parseInt(html.find('div.form-group').children()[1].value);
                    if (isNaN(val)) {
                        resolve(-1);
                    }
                    else {
                        resolve(val);
                    }
                }
            });
            hud.render(true);
        });
    }
}
DefaultConditionalVisibilitySystem.BASE_EFFECTS = new Array({
    id: MODULE_NAME + '.invisible',
    visibilityId: 'invisible',
    label: 'CONVIS.invisible',
    icon: 'modules/conditional-visibility/icons/unknown.svg'
}, {
    id: MODULE_NAME + '.obscured',
    visibilityId: 'obscured',
    label: 'CONVIS.obscured',
    icon: 'modules/conditional-visibility/icons/foggy.svg',
}, {
    id: MODULE_NAME + '.indarkness',
    visibilityId: 'indarkness',
    label: 'CONVIS.indarkness',
    icon: 'modules/conditional-visibility/icons/moon.svg'
});
