//事实证明,脑子是个好东西
//DeepProbeV4
(function (_Scratch) {
    const { ArgumentType, BlockType, TargetType, Cast, translate, extensions, runtime } = _Scratch;
    translate.setup({
        zh: { 'extensionName': '探针', 'reporterBlock': '[TEXT]的第[LETTER_NUM] 个字母', 'myReporter.TEXT_default': 'abcdefg' },
        en: { 'extensionName': 'probe', 'reporterBlock': 'letter [LETTER_NUM] of [TEXT]', 'myReporter.TEXT_default': 'abcdefg' }
    });
    function probeV4(rt) {
        const L = (...a) => console.log(...a);

        //ccwAPI
        if (rt.ccwAPI) {
            const own = Object.getOwnPropertyNames(rt.ccwAPI);
            L('[ccwAPI 自有成员]', own.length, own.join(', '));
            // 逐个看:是函数就标
            own.forEach(k => {
                let v;
                try { v = rt.ccwAPI[k]; } catch (e) { v = `<读取抛错: ${e.message}>`; }//打卡第一次
                L(`  ccwAPI.${k} =`, typeof v === 'function' ? '函数' : v);
            });
            //V3找到个getOpenVM,重头戏:能不能拿到整个VM
            if (typeof rt.ccwAPI.getOpenVM === 'function') {
                try {
                    const vm = rt.ccwAPI.getOpenVM();
                    L('[getOpenVM()]', vm ? '成功拿到 VM!' : '返回空(鉴权失败)');
                    if (vm) {
                        L('  VM 自有属性:', Object.keys(vm).join(', '));
                        L('  VM.runtime === rt ?', vm.runtime === rt);
                        L('  VM 原型方法:', Object.getOwnPropertyNames(
                            Object.getPrototypeOf(vm)).join(', '));
                    }
                } catch (e) { L('[getOpenVM() 抛错]', e.message); }//打卡第二次
            }
            //其它能直接读的元信息
            ['getProjectUUID', 'getProjectSb3Id', 'getDeviceType'].forEach(fn => {
                if (typeof rt.ccwAPI[fn] === 'function') {
                    try { L(`[${fn}()]`, rt.ccwAPI[fn]()); }
                    catch (e) { L(`[${fn}() 抛错]`, e.message); }//打卡第三次
                }
            });
        }
        //frameLoop帧循环
        if (rt.frameLoop) {
            L('[frameLoop] framerate =', rt.frameLoop.framerate,
                ' running =', rt.frameLoop.running,
                ' interpolation =', rt.frameLoop.interpolation);
            L('[frameLoop] stepCallback:', typeof rt.frameLoop.stepCallback);
            //method hook:看一帧里stepCallback被调用几次
            if (typeof rt.frameLoop.stepCallback === 'function' && !rt.frameLoop.__hooked) {
                const orig = rt.frameLoop.stepCallback.bind(rt.frameLoop);
                rt.frameLoop.stepCallback = function (...a) {
                    window.__frameCount = (window.__frameCount || 0) + 1;
                    return orig(...a);
                };
                rt.frameLoop.__hooked = true;
                L('[frameLoop] 已hook,跑5秒后执行console.log(window.__frameCount)');
            }
        }
        //测试用
        L('[编译器]当前:', JSON.stringify(rt.compilerOptions));
        try {
            rt.setCompilerOptions({ enabled: true, warpTimer: true });
            L('[编译器]尝试开启后:', JSON.stringify(rt.compilerOptions));
            L('[编译器]若仍是false则需要CCW权限或被上层锁定');
        } catch (e) { L('[编译器] 开启抛错:', e.message); }//打卡第四次
        //解决BEFORE_EXECUTE空payload
        //V3发现钩子不带数据,就自己去线程栈顶取
        if (!rt.__execHooked) {
            rt.on('BEFORE_EXECUTE', () => {
                const t = rt.threads && rt.threads[0];
                if (!t) return;
                const sid = typeof t.peekStack === 'function' ? t.peekStack() : null;
                if (!sid) return;
                //由积木id反查opcode
                const blk = t.blockContainer && t.blockContainer.getBlock
                    ? t.blockContainer.getBlock(sid) : null;
                if (blk && !window.__loggedOp) {
                    window.__loggedOp = 1;
                    L('[栈顶积木] id=', sid, ' opcode=', blk.opcode,
                        ' 角色=', t.target && t.target.getName && t.target.getName());
                }
            });
            rt.__execHooked = true;
        }
        //扩展实例,一定要在加载后调用,不然啥都找不到
        const exts = Object.keys(rt).filter(k => k.startsWith('ext_'));
        L('[扩展实例]', exts.length, exts.join(', '));
        L('[自己的实例 ext_someBlocks]', rt.ext_someBlocks || '尚不存在');
        //事件去重统计,吃了个好大的教训,找了半天全是AFTER BEFORE
        if (!rt.__statHooked) {
            window.__evtStat = {};
            const origEmit = rt.emit.bind(rt);
            rt.emit = function (n, ...r) {
                window.__evtStat[n] = (window.__evtStat[n] || 0) + 1;
                return origEmit(n, ...r);
            };
            rt.__statHooked = true;
            L('[事件统计] 已开启,跑一会儿后执行console.table(window.__evtStat)');
        }
    }
    //导出(挂在全局方便控制台直接调)
    window.probeV4 = probeV4;
    class MyExtension {
        constructor(_runtime) {
            this._runtime = _runtime;
            // 两个都探:_runtime是VM注入的,runtime是IIFE解构的
            probeV4(_runtime);
            probeV4(runtime);
            //顺便看两者是否同一对象
            try { console.log('[同一对象?]', _runtime === runtime); } catch (e) { }//打卡第五次
        }
        getInfo() {
            return {
                id: 'someBlocks',
                color1: '#FF8C1A',
                color2: '#DB6E00',
                name: translate({ id: 'extensionName' }),
                blocks: [{
                    opcode: 'getLetterByIndexFromText',
                    blockType: BlockType.REPORTER,
                    text: translate({ id: 'reporterBlock' }),
                    arguments: {
                        LETTER_NUM: { type: ArgumentType.NUMBER, defaultValue: 1 },
                        TEXT: { type: ArgumentType.STRING, defaultValue: translate({ id: 'myReporter.TEXT_default' }) }
                    }
                }, {
                    opcode: 'dumpRuntime',
                    blockType: BlockType.COMMAND,
                    text: '打印一次 runtime 清单',
                    arguments: {}
                }]
            };
        }
        dumpRuntime() {
            probeV4(this._runtime, 'on-demand');
        }
        getLetterByIndexFromText(args) {
            const { LETTER_NUM = 0, TEXT = '' } = args;
            const idx = Cast.toNumber(LETTER_NUM);
            const text = Cast.toString(TEXT);
            if (idx < 0 || idx >= text.length) return '';
            return text.charAt(idx);
        }
    }
    extensions.register(new MyExtension(runtime));
}(Scratch));
