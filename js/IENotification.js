'use strict';
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ienotification;
(function (ienotification) {
    var Position = (function () {
        function Position(_a) {
            var _b = _a.x, x = _b === void 0 ? 0 : _b, _c = _a.y, y = _c === void 0 ? 0 : _c, _d = _a.w, w = _d === void 0 ? 0 : _d, _e = _a.h, h = _e === void 0 ? 0 : _e;
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
        }
        Position.prototype.equals = function (pos) {
            return this.x == pos.x && this.y == pos.y && this.w == pos.w && this.h == pos.h;
        };
        return Position;
    }());
    ienotification.Position = Position;
    var Observable = (function () {
        function Observable() {
            var self = this;
            self.listeners = {};
            self.addEventListener.bind(self);
            self.removeEventListener.bind(self);
            self.dispatchEvent.bind(self);
            self.fire.bind(self);
            self.on.bind(self);
            self.un.bind(self);
        }
        Observable.prototype.addEventListener = function (eventName, func) {
            var handlers = this.listeners[eventName];
            if (handlers) {
                handlers.push(func);
            }
            else {
                handlers = [func];
                this.listeners[eventName] = handlers;
            }
        };
        Observable.prototype.removeEventListener = function (eventName, func) {
            var handlers = this.listeners[eventName];
            if (handlers) {
                var index = handlers.indexOf(func);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        };
        Observable.prototype.dispatchEvent = function (eventName) {
            var self = this;
            var handlers = self.listeners[eventName];
            var evt = new ObjectEvent(eventName);
            if (handlers) {
                handlers.some(function (func) {
                    try {
                        func.call(self, evt);
                        if (evt.stop) {
                            return true;
                        }
                    }
                    catch (error) {
                        console.log("Error in dispatchEvent " + eventName + "..." + error.message);
                        if (evt.stopWhenError) {
                            return true;
                        }
                    }
                });
            }
        };
        Observable.prototype.fire = function (eventName) {
            this.dispatchEvent(eventName);
        };
        Observable.prototype.on = function (eventName, func) {
            this.addEventListener(eventName, func);
        };
        Observable.prototype.un = function (eventName, func) {
            this.removeEventListener(eventName, func);
        };
        return Observable;
    }());
    var ObjectEvent = (function () {
        function ObjectEvent(name) {
            this.name = name;
            this.stop = false;
            this.stopWhenError = true;
        }
        return ObjectEvent;
    }());
    var DelayTasks = (function () {
        function DelayTasks() {
            this.tasks = {};
        }
        DelayTasks.prototype.addTask = function (taskName, func, delay, repeat) {
            if (repeat === void 0) { repeat = false; }
            if (repeat) {
                this.tasks[taskName] = -setInterval(func, delay);
            }
            else {
                this.tasks[taskName] = setTimeout(func, delay);
            }
        };
        DelayTasks.prototype.addRepeatTask = function (taskName, func, delay) {
            this.addTask(taskName, func, delay, true);
        };
        DelayTasks.prototype.endTask = function (taskName) {
            var id = this.tasks[taskName];
            if (id > 0) {
                clearTimeout(id);
            }
            else {
                clearInterval(-id);
            }
            delete this.tasks[taskName];
        };
        DelayTasks.prototype.endAllTasks = function () {
            var _this = this;
            Object.keys(this.tasks).forEach(function (taskName) { return _this.endTask(taskName); });
        };
        return DelayTasks;
    }());
    //-------------------------------------------------------------------------------
    var EVENT_OPEN = 'OPEN';
    var EVENT_DISPOSE = 'DISPOSE';
    var IENotification = (function (_super) {
        __extends(IENotification, _super);
        function IENotification(title, options) {
            _super.call(this);
            var self = this;
            self.title = title;
            if (options) {
                self.body = options.body;
                self.icon = options.icon;
                self.data = options.data;
            }
            self.delayTasks = new DelayTasks();
            IENotificationQueue.add(self);
        }
        IENotification.prototype.show = function () {
            var self = this;
            var height = IENotification.notificationHeight;
            var width = IENotification.notificationWidth;
            var left = screen.width - width;
            var top = screen.height - height;
            var bridge = window.open(IENotification.notificationPath + "bridge.html", self.title, "width=" + width + ",height=" + height + ",top=" + top + ",left=" + left + ",center=0,resizable=0,scroll=0,status=0,location=0");
            IENotification.edgeX = bridge.screenLeft - left;
            IENotification.edgeY = bridge.screenTop - top;
            self._bridge = bridge;
            self.delayTasks.addTask('initBridge', function () {
                self._initBridge(bridge);
            }, 10);
            self.fire(EVENT_OPEN);
            window.addEventListener('unload', function () { return self.close(); });
        };
        IENotification.prototype.close = function () {
            var self = this;
            if (self._bridge) {
                self._bridge.close();
                self._bridge = null;
            }
            if (self._popup) {
                self._popup.close();
                self._popup = null;
            }
        };
        IENotification.prototype.dispose = function () {
            var self = this;
            this.delayTasks.endAllTasks();
            if (self._bridge) {
                self._bridge.close();
            }
            self.fire(EVENT_DISPOSE);
            console.log('close notification...');
        };
        IENotification.prototype._initBridge = function (bridge) {
            var self = this;
            var height = IENotification.notificationHeight + IENotification.edgeY;
            var width = IENotification.notificationWidth + IENotification.edgeX;
            var left = screen.width - width;
            var top = screen.height - height;
            var popup = bridge.showModelessDialog("content.html", self, "dialogWidth:" + width + "px;dialogHeight:" + height + "px;dialogTop:" + top + "px;dialogLeft:" + left + "px;center:0;resizable:0;scroll:0;status:0;alwaysRaised=yes");
            self._popup = popup;
            // self.delayTasks.addRepeatTask('fixDialogPosition', ()=>fixDialogPosition(popup), 100);
            self.delayTasks.addRepeatTask('fixBridgePosition', function () { return hideWindowBehindDialog(bridge, popup); }, 100);
            self.delayTasks.addTask('closePopup', function () { return self.close(); }, IENotification.timeout);
        };
        IENotification.prototype._initPopup = function (popup) {
            var self = this;
            var titleDiv = popup.document.getElementById('title-div');
            titleDiv.innerHTML = self.title;
            var bodyDiv = popup.document.getElementById('body-div');
            bodyDiv.innerText = self.body;
            var iconImg = popup.document.getElementById('icon-img');
            popup.document.title = appendBlankForTitle('');
            iconImg.src = self.icon.indexOf('data:image/png;base64') == 0 ? self.icon : IENotification.basePath + self.icon;
            popup.addEventListener('click', function (event) { return self._doClick(event); });
            popup.addEventListener('blur', function () { return self.dispose(); });
            popup.addEventListener('unload', function () { return self.dispose(); });
            popup.focus();
        };
        IENotification.initContentInPopup = function (popup) {
            popup.dialogArguments._initPopup(popup);
        };
        //We don't need to implement this, just compatible with formal API
        IENotification.requestPermission = function (callback) {
            if (callback && callback instanceof Function) {
                callback('granted');
            }
            else {
                return new Promise(function (res, rej) {
                    res('granted');
                });
            }
        };
        IENotification.prototype._doClick = function (event) {
            var self = this;
            event['notification'] = self;
            if (self.onclick instanceof Function) {
                self.onclick(event);
            }
            self.close();
            window.focus();
        };
        IENotification.timeout = 20000;
        IENotification.notificationHeight = 90;
        IENotification.notificationWidth = 360;
        IENotification.edgeX = 0;
        IENotification.edgeY = 0;
        return IENotification;
    }(Observable));
    function getDialogPosition(dialog) {
        return new Position({
            x: pxToNumber(dialog.dialogLeft),
            y: pxToNumber(dialog.dialogTop),
            w: pxToNumber(dialog.dialogWidth),
            h: pxToNumber(dialog.dialogHeight)
        });
    }
    function setDialogPosition(dialog, pos) {
        if (getDialogPosition(dialog).equals(pos)) {
            return;
        }
        dialog.dialogLeft = numberToPx(pos.x);
        dialog.dialogTop = numberToPx(pos.y);
        dialog.dialogWidth = numberToPx(pos.w);
        dialog.dialogHeight = numberToPx(pos.h);
    }
    function appendBlankForTitle(title) {
        var ret = [title];
        for (var i = 0; i < 40; i++) {
            ret.push('\u00A0\u00A0\u00A0\u00A0\u00A0');
        }
        return ret.join('');
    }
    function fixDialogPosition(dialog) {
        if (!dialog) {
            return;
        }
        try {
            if (!dialog.fixedPosition) {
                dialog.fixedPosition = getDialogPosition(dialog);
                return;
            }
            setDialogPosition(dialog, dialog.fixedPosition);
        }
        catch (e) {
        }
    }
    function hideWindowBehindDialog(wnd, dialog) {
        if (!dialog) {
            return;
        }
        try {
            var dialogPos = getDialogPosition(dialog);
            if (wnd.lastPosition && wnd.lastPosition.equals(dialogPos)) {
                return;
            }
            wnd.moveTo(dialogPos.x + 20, dialogPos.y + 20);
            wnd.resizeTo(dialogPos.w - 20, dialogPos.h - 20);
            wnd.lastPosition = dialogPos;
        }
        catch (e) {
        }
    }
    function pxToNumber(str) {
        if (str.length < 2) {
            return 0;
        }
        return Number(str.substring(0, str.length - 2));
    }
    function numberToPx(num) {
        return num + 'px';
    }
    var IENotificationQueue;
    (function (IENotificationQueue) {
        var maxQueueSize = 20;
        var popupQueue = [];
        var currentNoti;
        function add(noti) {
            if (popupQueue.length > maxQueueSize) {
                return;
            }
            noti.on(EVENT_OPEN, function () { return currentNoti = noti; });
            noti.on(EVENT_DISPOSE, function () {
                currentNoti = null;
                remove(noti);
            });
            if (isEmpty() && !currentNoti) {
                noti.show();
            }
            else {
                popupQueue.push(noti);
            }
        }
        IENotificationQueue.add = add;
        function remove(noti) {
            arrayRemove(popupQueue, noti);
            if (!isEmpty()) {
                window.setTimeout(function () { return popupQueue.pop().show(); }, 200);
            }
        }
        function isEmpty() {
            return popupQueue.length == 0;
        }
        function arrayRemove(arr, item) {
            var index = arr.indexOf(item);
            if (index > -1) {
                arr.splice(index, 1);
            }
        }
    })(IENotificationQueue || (IENotificationQueue = {}));
    function syncWindowPosition(targetWin, refWin, offset) {
        if (offset === void 0) { offset = { x: 0, y: 0 }; }
        try {
            var x = refWin.screenX + offset.x;
            var y = refWin.screenY + offset.y;
            if (targetWin.screenX != x || targetWin.screenY != y) {
                targetWin.moveTo(x, y);
            }
        }
        catch (e) {
        }
    }
    function getDefaultRootPath() {
        var queryStr = window.location.search;
        var urlStr = window.location.href;
        var path = urlStr.substr(0, urlStr.length - queryStr.length);
        return path.substring(0, path.lastIndexOf('/')) + '/';
    }
    IENotification.basePath = getDefaultRootPath();
    IENotification.notificationPath = IENotification.basePath + "IENotification/";
    if (!window.Notification) {
        window.Notification = window.IENotification = IENotification;
    }
})(ienotification || (ienotification = {}));
//# sourceMappingURL=IENotification.js.map