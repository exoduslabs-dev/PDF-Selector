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
var promises_1 = require("fs/promises");
var path_1 = require("path");
var pg_1 = require("pg");
var dotenv_1 = require("dotenv");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
var ROOT_DIR = '/Volumes/Archives/Next-Label/database';
function getAllFiles(dir) {
    return __awaiter(this, void 0, void 0, function () {
        var files, _i, _a, entry, fullPath, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    files = [];
                    _i = 0;
                    return [4 /*yield*/, (0, promises_1.readdir)(dir, { withFileTypes: true })];
                case 1:
                    _a = _d.sent();
                    _d.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    entry = _a[_i];
                    fullPath = path_1.default.join(dir, entry.name);
                    if (!entry.isDirectory()) return [3 /*break*/, 4];
                    _c = (_b = files).concat;
                    return [4 /*yield*/, getAllFiles(fullPath)];
                case 3:
                    files = _c.apply(_b, [_d.sent()]);
                    return [3 /*break*/, 5];
                case 4:
                    files.push(fullPath);
                    _d.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6: return [2 /*return*/, files];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var client, files, _i, files_1, filePath, fileName, stats, uploadedAt, exists;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = new pg_1.Client();
                    return [4 /*yield*/, client.connect()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, getAllFiles(ROOT_DIR)];
                case 2:
                    files = _a.sent();
                    _i = 0, files_1 = files;
                    _a.label = 3;
                case 3:
                    if (!(_i < files_1.length)) return [3 /*break*/, 9];
                    filePath = files_1[_i];
                    fileName = path_1.default.basename(filePath);
                    return [4 /*yield*/, (0, promises_1.stat)(filePath)];
                case 4:
                    stats = _a.sent();
                    uploadedAt = stats.birthtime;
                    return [4 /*yield*/, client.query('SELECT 1 FROM customer_file_index WHERE fileName = $1 AND fileLocation = $2', [fileName, filePath])];
                case 5:
                    exists = _a.sent();
                    if (!(exists.rowCount === 0)) return [3 /*break*/, 7];
                    // Insert new file record
                    return [4 /*yield*/, client.query('INSERT INTO customer_file_index (id, fileName, fileLocation, uploadedAt) VALUES (gen_random_uuid(), $1, $2, $3)', [fileName, filePath, uploadedAt])];
                case 6:
                    // Insert new file record
                    _a.sent();
                    console.log("Indexed: ".concat(filePath));
                    return [3 /*break*/, 8];
                case 7:
                    console.log("Already indexed: ".concat(filePath));
                    _a.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 3];
                case 9: return [4 /*yield*/, client.end()];
                case 10:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (err) {
    console.error(err);
    process.exit(1);
});
