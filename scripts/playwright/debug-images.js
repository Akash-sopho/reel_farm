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
function debugImages() {
    return __awaiter(this, void 0, void 0, function () {
        var session, page, consoleLogs, pageErrors, response, templates, first, imgCount, imgWithSrc, imgs, i, src, alt, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, _helpers_1.openBrowser)(true)];
                case 1:
                    session = _a.sent();
                    page = session.page, consoleLogs = session.consoleLogs, pageErrors = session.pageErrors;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 15, , 16]);
                    console.log('🔍 Checking for image loading issues...\n');
                    // Step 1: Fetch the templates API directly
                    console.log('1️⃣ Fetching /api/templates...');
                    return [4 /*yield*/, page.context().request.get('http://localhost:3001/api/templates')];
                case 3:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 4:
                    templates = _a.sent();
                    if (templates && templates.length > 0) {
                        console.log("\u2713 Got ".concat(templates.length, " templates"));
                        console.log('\nFirst template preview:');
                        first = templates[0];
                        console.log("  ID: ".concat(first.id));
                        console.log("  Name: ".concat(first.name));
                        console.log("  Data keys: ".concat(Object.keys(first).join(', ')));
                        // Look for image-related fields
                        if (first.data) {
                            console.log("  Template.data keys: ".concat(Object.keys(first.data).join(', ')));
                            console.log("  Template.data preview: ".concat(JSON.stringify(first.data).substring(0, 200), "..."));
                        }
                        if (first.thumbnail) {
                            console.log("  Thumbnail: ".concat(first.thumbnail));
                        }
                        if (first.image) {
                            console.log("  Image: ".concat(first.image));
                        }
                        if (first.imageUrl) {
                            console.log("  ImageUrl: ".concat(first.imageUrl));
                        }
                        if (first.preview) {
                            console.log("  Preview: ".concat(first.preview));
                        }
                        (0, _helpers_1.writeOutput)('api-templates-response', templates);
                    }
                    else {
                        console.log('✗ No templates returned');
                    }
                    console.log('\n2️⃣ Navigating to templates page and checking console...');
                    return [4 /*yield*/, page.goto('http://localhost:5173/templates', { waitUntil: 'load', timeout: 10000 })];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(2000)];
                case 6:
                    _a.sent();
                    console.log('\nConsole logs and errors:');
                    if (pageErrors.length > 0) {
                        console.log('🔴 ERRORS:');
                        pageErrors.forEach(function (err) { return console.log("  ".concat(err)); });
                    }
                    else {
                        console.log('✅ No console errors');
                    }
                    if (consoleLogs.length > 0) {
                        console.log('\n📋 Console messages:');
                        consoleLogs.forEach(function (log) {
                            if (log.toLowerCase().includes('image') || log.toLowerCase().includes('error') || log.toLowerCase().includes('404') || log.toLowerCase().includes('cors')) {
                                console.log("  ".concat(log));
                            }
                        });
                    }
                    console.log('\n3️⃣ Checking img elements on page...');
                    return [4 /*yield*/, page.locator('img').count()];
                case 7:
                    imgCount = _a.sent();
                    console.log("  Total img tags: ".concat(imgCount));
                    return [4 /*yield*/, page.locator('img[src]').count()];
                case 8:
                    imgWithSrc = _a.sent();
                    console.log("  Img tags with src: ".concat(imgWithSrc));
                    return [4 /*yield*/, page.locator('img').all()];
                case 9:
                    imgs = _a.sent();
                    if (!(imgs.length > 0)) return [3 /*break*/, 14];
                    console.log('\n  First 3 img elements:');
                    i = 0;
                    _a.label = 10;
                case 10:
                    if (!(i < Math.min(3, imgs.length))) return [3 /*break*/, 14];
                    return [4 /*yield*/, imgs[i].getAttribute('src')];
                case 11:
                    src = _a.sent();
                    return [4 /*yield*/, imgs[i].getAttribute('alt')];
                case 12:
                    alt = _a.sent();
                    console.log("    [".concat(i, "] src=\"").concat(src, "\" alt=\"").concat(alt, "\""));
                    _a.label = 13;
                case 13:
                    i++;
                    return [3 /*break*/, 10];
                case 14: return [3 /*break*/, 16];
                case 15:
                    error_1 = _a.sent();
                    console.error('❌ Error:', error_1);
                    return [3 /*break*/, 16];
                case 16: return [4 /*yield*/, (0, _helpers_1.closeBrowser)(session)];
                case 17:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
debugImages().catch(function (err) {
    console.error('Fatal error:', err);
    process.exit(1);
});
