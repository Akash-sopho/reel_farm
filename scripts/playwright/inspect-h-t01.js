"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var _helpers_1 = require("./_helpers");
function inspectPage() {
    return __awaiter(this, void 0, void 0, function () {
        var session, page, useTemplateBtns, buttonParents, _a, _b, _c, _d, _e, _f, _g, _h, _j, error_1;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0: return [4 /*yield*/, (0, _helpers_1.openBrowser)(true)];
                case 1:
                    session = _k.sent();
                    page = session.page;
                    _k.label = 2;
                case 2:
                    _k.trys.push([2, 9, , 10]);
                    return [4 /*yield*/, page.goto('http://localhost:5173/templates', { waitUntil: 'load', timeout: 10000 })];
                case 3:
                    _k.sent();
                    return [4 /*yield*/, page.locator('button:has-text("Use Template")').count()];
                case 4:
                    useTemplateBtns = _k.sent();
                    console.log("Found ".concat(useTemplateBtns, " \"Use Template\" buttons"));
                    return [4 /*yield*/, page.locator('button:has-text("Use Template")').first().evaluate(function (btn) {
                            var parent = btn.parentElement;
                            var selectors = [];
                            for (var i = 0; i < 5; i++) {
                                if (!parent)
                                    break;
                                var classes = parent.className || '';
                                var id = parent.id || '';
                                var tag = parent.tagName;
                                selectors.push("".concat(tag, ".").concat(classes.split(' ').join('.')).concat(id ? '#' + id : ''));
                                parent = parent.parentElement;
                            }
                            return selectors;
                        })];
                case 5:
                    buttonParents = _k.sent();
                    console.log('Parent hierarchy:');
                    console.log(buttonParents);
                    // Try different selectors
                    console.log('\nTrying selectors:');
                    _b = (_a = console).log;
                    _c = "  div: ".concat;
                    return [4 /*yield*/, page.locator('div').count()];
                case 6:
                    _b.apply(_a, [_c.apply("  div: ", [_k.sent()])]);
                    _e = (_d = console).log;
                    _f = "  [class*=\"card\"]: ".concat;
                    return [4 /*yield*/, page.locator('[class*="card"]').count()];
                case 7:
                    _e.apply(_d, [_f.apply("  [class*=\"card\"]: ", [_k.sent()])]);
                    _h = (_g = console).log;
                    _j = "  [class*=\"template\"]: ".concat;
                    return [4 /*yield*/, page.locator('[class*="template"]').count()];
                case 8:
                    _h.apply(_g, [_j.apply("  [class*=\"template\"]: ", [_k.sent()])]);
                    return [3 /*break*/, 10];
                case 9:
                    error_1 = _k.sent();
                    console.error('Error:', error_1);
                    return [3 /*break*/, 10];
                case 10: return [4 /*yield*/, (0, _helpers_1.closeBrowser)(session)];
                case 11:
                    _k.sent();
                    return [2 /*return*/];
            }
        });
    });
}
inspectPage().catch(function (err) {
    console.error('Fatal error:', err);
    process.exit(1);
});
