"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var stream_1 = require("stream");
var TerminalBase = /** @class */ (function (_super) {
    __extends(TerminalBase, _super);
    function TerminalBase(options) {
        var _this = _super.call(this, options) || this;
        _this.cols = 80;
        _this.rows = 30;
        _this.encoding = 'utf8';
        if (options) {
            _this.encoding = options.encoding || 'utf8';
            _this.env = Object.assign({}, process.env, options.env);
            _this.cols = options.cols || 80;
            _this.rows = options.rows || 30;
            _this.path = options.path;
            _this.argv = options.argv;
        }
        else {
            _this.env = Object.assign({}, process.env);
        }
        return _this;
    }
    TerminalBase.prototype.spawn = function () { };
    TerminalBase.prototype._pushData = function (data) {
        if (this._buffered)
            this._buffered.push(data);
        else if (!this.push(data, this.encoding))
            this._buffered = [];
    };
    TerminalBase.prototype._read = function () {
        if (!this._buffered)
            return;
        for (var i = 0; i < this._buffered.length; i++)
            if (!this.push(this._buffered[i], this.encoding)) {
                this._buffered = this._buffered.slice(i + 1);
                return;
            }
        delete this._buffered;
    };
    TerminalBase.prototype.resize = function (cols, rows) {
        this.cols = cols;
        this.rows = rows;
    };
    TerminalBase.prototype.dropFiles = function (file) { };
    return TerminalBase;
}(stream_1.Duplex));
exports.TerminalBase = TerminalBase;
//# sourceMappingURL=base.js.map