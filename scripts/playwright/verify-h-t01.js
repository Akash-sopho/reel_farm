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
function verifyHTT01() {
    return __awaiter(this, void 0, void 0, function () {
        var session, page, templateCardsVisible, categoryTabs, filterWorking, hoverEffectWorks, cardLocator, tabLocator, tabs, allTab, lifestyleTab, _a, initialCount, filteredCount, allCount, firstCard, useTemplateBtn, isVisible, screenshotPath, error_1, result;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('🔍 Starting H-T01 verification (Template Gallery)...\n');
                    return [4 /*yield*/, (0, _helpers_1.openBrowser)(true)];
                case 1:
                    session = _b.sent();
                    page = session.page;
                    templateCardsVisible = 0;
                    categoryTabs = [];
                    filterWorking = false;
                    hoverEffectWorks = false;
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 26, , 27]);
                    // Step 1: Navigate to templates page
                    console.log('📍 Navigating to http://localhost:5173/templates...');
                    return [4 /*yield*/, page.goto('http://localhost:5173/templates', { waitUntil: 'load', timeout: 10000 })];
                case 3:
                    _b.sent();
                    console.log('✓ Templates page loaded.\n');
                    // Step 2: Count template cards
                    console.log('📊 Counting template cards...');
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 4:
                    _b.sent(); // Wait for React render
                    cardLocator = page.locator('.bg-white.rounded-lg.shadow-md');
                    return [4 /*yield*/, cardLocator.count()];
                case 5:
                    templateCardsVisible = _b.sent();
                    console.log("  Found ".concat(templateCardsVisible, " template cards"));
                    console.log();
                    // Step 3: Extract category tabs
                    console.log('🏷️ Extracting category filter tabs...');
                    tabLocator = page.locator('[data-testid="category-tab"], [class*="tab"], button:has-text("All")');
                    return [4 /*yield*/, page.locator('button').allTextContents()];
                case 6:
                    tabs = _b.sent();
                    categoryTabs = Array.from(new Set(tabs.filter(function (t) { return t.trim().length > 0 && t.trim().length < 30; })));
                    console.log("  Found tabs: ".concat(categoryTabs.join(', ')));
                    console.log();
                    // Step 4: Test filtering
                    console.log('🔄 Testing category filter...');
                    allTab = page.locator('button').filter({ hasText: 'All' }).first();
                    lifestyleTab = page.locator('button').filter({ hasText: 'lifestyle' }).first();
                    return [4 /*yield*/, allTab.count()];
                case 7:
                    _a = (_b.sent()) > 0;
                    if (!_a) return [3 /*break*/, 9];
                    return [4 /*yield*/, lifestyleTab.count()];
                case 8:
                    _a = (_b.sent()) > 0;
                    _b.label = 9;
                case 9:
                    if (!_a) return [3 /*break*/, 17];
                    return [4 /*yield*/, page.locator('.bg-white.rounded-lg.shadow-md').count()];
                case 10:
                    initialCount = _b.sent();
                    console.log("  Initial card count (All): ".concat(initialCount));
                    // Click lifestyle
                    return [4 /*yield*/, lifestyleTab.click()];
                case 11:
                    // Click lifestyle
                    _b.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 12:
                    _b.sent(); // Wait for filter to apply
                    return [4 /*yield*/, page.locator('.bg-white.rounded-lg.shadow-md').count()];
                case 13:
                    filteredCount = _b.sent();
                    console.log("  Card count after clicking \"lifestyle\": ".concat(filteredCount));
                    // Click All again
                    return [4 /*yield*/, allTab.click()];
                case 14:
                    // Click All again
                    _b.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 15:
                    _b.sent();
                    return [4 /*yield*/, page.locator('.bg-white.rounded-lg.shadow-md').count()];
                case 16:
                    allCount = _b.sent();
                    console.log("  Card count after clicking \"All\": ".concat(allCount));
                    filterWorking = filteredCount < initialCount && allCount === initialCount;
                    console.log("  Filter working: ".concat(filterWorking, "\n"));
                    return [3 /*break*/, 18];
                case 17:
                    console.log('  ⚠️ Could not locate filter tabs\n');
                    _b.label = 18;
                case 18:
                    // Step 5: Test hover effect (check if button appears on hover)
                    console.log('🖱️ Testing hover effect...');
                    firstCard = page.locator('.bg-white.rounded-lg.shadow-md').first();
                    return [4 /*yield*/, firstCard.count()];
                case 19:
                    if (!((_b.sent()) > 0)) return [3 /*break*/, 23];
                    return [4 /*yield*/, firstCard.hover()];
                case 20:
                    _b.sent();
                    return [4 /*yield*/, page.waitForTimeout(300)];
                case 21:
                    _b.sent(); // Wait for animation
                    useTemplateBtn = page.locator('button').filter({ hasText: 'Use Template' }).first();
                    return [4 /*yield*/, useTemplateBtn.isVisible().catch(function () { return false; })];
                case 22:
                    isVisible = _b.sent();
                    hoverEffectWorks = isVisible;
                    console.log("  \"Use Template\" button visible on hover: ".concat(hoverEffectWorks, "\n"));
                    return [3 /*break*/, 24];
                case 23:
                    console.log('  ⚠️ No template cards to hover over\n');
                    _b.label = 24;
                case 24:
                    // Step 6: Screenshot gallery
                    console.log('📸 Capturing screenshot...');
                    return [4 /*yield*/, (0, _helpers_1.screenshot)(page, 'h-t01-gallery')];
                case 25:
                    screenshotPath = _b.sent();
                    console.log("\u2713 Screenshot saved to ".concat(screenshotPath, "\n"));
                    return [3 /*break*/, 27];
                case 26:
                    error_1 = _b.sent();
                    console.error('❌ Error during verification:', error_1);
                    return [3 /*break*/, 27];
                case 27:
                    result = {
                        totalTemplates: templateCardsVisible,
                        categories: categoryTabs,
                        filterWorking: filterWorking,
                        hoverEffectWorks: hoverEffectWorks,
                        timestamp: new Date().toISOString(),
                        summary: templateCardsVisible >= 1 && categoryTabs.length >= 2 && filterWorking
                            ? 'PASS'
                            : 'FAIL',
                    };
                    (0, _helpers_1.writeOutput)('h-t01-result', result);
                    console.log('📊 Results written to output/h-t01-result.txt');
                    console.log("\n".concat(JSON.stringify(result, null, 2)));
                    return [4 /*yield*/, (0, _helpers_1.closeBrowser)(session)];
                case 28:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
verifyHTT01().catch(function (err) {
    console.error('Fatal error:', err);
    process.exit(1);
});
