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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OUTPUT_DIR = void 0;
exports.openBrowser = openBrowser;
exports.screenshot = screenshot;
exports.writeOutput = writeOutput;
exports.closeBrowser = closeBrowser;
var test_1 = require("@playwright/test");
var fs = require("fs");
var path = require("path");
exports.OUTPUT_DIR = path.join(__dirname, 'output');
fs.mkdirSync(exports.OUTPUT_DIR, { recursive: true });
function openBrowser() {
    return __awaiter(this, arguments, void 0, function (headless) {
        var browser, context, page, consoleLogs, pageErrors;
        if (headless === void 0) { headless = true; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, test_1.chromium.launch({ headless: headless })];
                case 1:
                    browser = _a.sent();
                    return [4 /*yield*/, browser.newContext({ viewport: { width: 1280, height: 900 } })];
                case 2:
                    context = _a.sent();
                    return [4 /*yield*/, context.newPage()];
                case 3:
                    page = _a.sent();
                    consoleLogs = [];
                    pageErrors = [];
                    page.on('console', function (msg) {
                        consoleLogs.push("[".concat(msg.type().toUpperCase(), "] ").concat(msg.text()));
                    });
                    page.on('pageerror', function (err) {
                        pageErrors.push("[PAGE ERROR] ".concat(err.message));
                    });
                    return [2 /*return*/, { browser: browser, page: page, consoleLogs: consoleLogs, pageErrors: pageErrors }];
            }
        });
    });
}
function screenshot(page, name) {
    return __awaiter(this, void 0, void 0, function () {
        var filePath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    filePath = path.join(exports.OUTPUT_DIR, "".concat(name, ".png"));
                    return [4 /*yield*/, page.screenshot({ path: filePath, fullPage: true })];
                case 1:
                    _a.sent();
                    return [2 /*return*/, filePath];
            }
        });
    });
}
function writeOutput(name, data) {
    var content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    fs.writeFileSync(path.join(exports.OUTPUT_DIR, "".concat(name, ".txt")), content);
}
function closeBrowser(session) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    writeOutput('console', __spreadArray(__spreadArray([], session.consoleLogs, true), session.pageErrors, true).join('\n') || '(no console output)');
                    return [4 /*yield*/, session.browser.close()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
