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
function verifyThumbnails() {
    return __awaiter(this, void 0, void 0, function () {
        var session, page, imgs, imgsWithSrc, imgsWithValidSrc, _i, imgs_1, img, src, cardCount, screenshotPath, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🖼️ Verifying thumbnail images...\n');
                    return [4 /*yield*/, (0, _helpers_1.openBrowser)(true)];
                case 1:
                    session = _a.sent();
                    page = session.page;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 12, , 13]);
                    // Navigate to templates
                    console.log('📍 Navigating to http://localhost:5173/templates...');
                    return [4 /*yield*/, page.goto('http://localhost:5173/templates', { waitUntil: 'load', timeout: 10000 })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(2000)];
                case 4:
                    _a.sent();
                    // Check for img elements with src
                    console.log('🔍 Checking for images...');
                    return [4 /*yield*/, page.locator('img').all()];
                case 5:
                    imgs = _a.sent();
                    console.log("  Found ".concat(imgs.length, " img tags"));
                    imgsWithSrc = 0;
                    imgsWithValidSrc = 0;
                    _i = 0, imgs_1 = imgs;
                    _a.label = 6;
                case 6:
                    if (!(_i < imgs_1.length)) return [3 /*break*/, 9];
                    img = imgs_1[_i];
                    return [4 /*yield*/, img.getAttribute('src')];
                case 7:
                    src = _a.sent();
                    if (src && src.trim()) {
                        imgsWithSrc++;
                        if (src.includes('minio') || src.includes('localhost:9000')) {
                            imgsWithValidSrc++;
                            console.log("  \u2713 Valid MinIO image: ".concat(src.substring(0, 60), "..."));
                        }
                    }
                    _a.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 6];
                case 9:
                    console.log("\n  Summary:");
                    console.log("  - Images with src attribute: ".concat(imgsWithSrc));
                    console.log("  - Images from MinIO: ".concat(imgsWithValidSrc));
                    return [4 /*yield*/, page.locator('.bg-white.rounded-lg.shadow-md').count()];
                case 10:
                    cardCount = _a.sent();
                    console.log("  - Template cards: ".concat(cardCount));
                    // Take screenshot
                    console.log('\n📸 Taking screenshot...');
                    return [4 /*yield*/, (0, _helpers_1.screenshot)(page, 'thumbnails-loaded')];
                case 11:
                    screenshotPath = _a.sent();
                    console.log("\u2713 Screenshot saved");
                    result = {
                        imagesLoaded: imgsWithSrc > 0,
                        minioImagesLoaded: imgsWithValidSrc > 0,
                        totalCards: cardCount,
                        timestamp: new Date().toISOString(),
                        summary: imgsWithValidSrc > 0 ? 'PASS' : 'FAIL',
                    };
                    (0, _helpers_1.writeOutput)('thumbnails-check', result);
                    console.log("\n".concat(JSON.stringify(result, null, 2)));
                    return [3 /*break*/, 13];
                case 12:
                    error_1 = _a.sent();
                    console.error('❌ Error:', error_1);
                    return [3 /*break*/, 13];
                case 13: return [4 /*yield*/, (0, _helpers_1.closeBrowser)(session)];
                case 14:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
verifyThumbnails().catch(function (err) {
    console.error('Fatal error:', err);
    process.exit(1);
});
