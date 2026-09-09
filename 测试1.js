//事实证明,脑子是个好东西
//DCB AT 26 9 9
//方便我们hook runtime里的玩意
(function (_Scratch) {
    const {ArgumentType, BlockType, TargetType, Cast, translate, extensions, runtime} = _Scratch;

    translate.setup({
        zh: {'extensionName': '探针', 'reporterBlock': '[TEXT]的第[LETTER_NUM] 个字母', 'myReporter.TEXT_default': 'abcdefg'},
        en: {'extensionName': 'probe', 'reporterBlock': 'letter [LETTER_NUM] of [TEXT]', 'myReporter.TEXT_default': 'abcdefg'}
    });
    //探针:探测一个runtime对象.tag用来区分是哪个
    function probe (rt, tag) {
        if (!rt) { console.log(`[${tag}] 为空`); return; }
        console.log(`===== [${tag}] 开始 =====`);
        //自有属性
        let keys = [];
        try { keys = Object.keys(rt); } catch (e) { console.log(`[${tag}] Object.keys 失败:`, e.message); }
        //不可枚举的属性也捞出来
        let all = [];
        try { all = Object.getOwnPropertyNames(rt); } catch (e) {}
        const vanilla = ['threads','targets','executableTargets','sequencer','ioDevices','profiler',
            'currentMSecs','currentStepTime','redrawRequested','turboMode','compatibilityMode',
            '_hats','_primitives','_editingTarget','_cloneCounter','_monitorState','origin',
            '_steppingInterval','_events','_eventsCount','_maxListeners'];
        const extra = all.filter(k => !vanilla.includes(k));
        console.log(`[${tag}] 属性总数 = ${all.length}`);
        console.log(`[${tag}] 可枚举 = ${keys.length}`, keys.sort().join(', '));
        console.log(`[${tag}] 疑似Gandi新增 = ${extra.length}`, extra.sort().join(', '));
        //原型链方法
        try {
            const proto = Object.getPrototypeOf(rt);
            const meths = Object.getOwnPropertyNames(proto);
            console.log(`[${tag}] 原型方法数 = ${meths.length}`);
            console.log(`[${tag}] 方法:`, meths.sort().join(', '));
        } catch (e) { console.log(`[${tag}] 原型读取失败:`, e.message); }
        //hook emit抓事件(hook一次,避免套娃)
        try {
            if (!rt.__emitHooked) {
                const origEmit = rt.emit.bind(rt);
                rt.emit = function (name, ...rest) {
                    console.log('[EVENT]', name);
                    return origEmit(name, ...rest);
                };
                rt.__emitHooked = true;
            }
        } catch (e) { console.log(`[${tag}] emit hook 失败:`, e.message); }
        console.log(`[${tag}] 结束`);
    }
    class MyExtension {
        constructor (_runtime) {
            this._runtime = _runtime;
            // 两个都探:_runtime是VM注入的,runtime是IIFE解构的
            probe(_runtime, 'injected');
            probe(runtime, 'destructured');
            //顺便看两者是否同一对象
            try { console.log('[同一对象?]', _runtime === runtime); } catch (e) {}
        }
        getInfo () {
            return {
                id: 'someBlocks',
                color1: '#FF8C1A',
                color2: '#DB6E00',
                name: translate({id: 'extensionName'}),
                blocks: [{
                    opcode: 'getLetterByIndexFromText',
                    blockType: BlockType.REPORTER,
                    text: translate({id: 'reporterBlock'}),
                    arguments: {
                        LETTER_NUM: {type: ArgumentType.NUMBER, defaultValue: 1},
                        TEXT: {type: ArgumentType.STRING, defaultValue: translate({id: 'myReporter.TEXT_default'})}
                    }
                }, {
                    opcode: 'dumpRuntime',
                    blockType: BlockType.COMMAND,
                    text: '打印一次 runtime 清单',
                    arguments: {}
                }]
            };
        }
        dumpRuntime () {
            probe(this._runtime, 'on-demand');
        }
        getLetterByIndexFromText (args) {
            const {LETTER_NUM = 0, TEXT = ''} = args;
            const idx = Cast.toNumber(LETTER_NUM);
            const text = Cast.toString(TEXT);
            if (idx < 0 || idx >= text.length) return '';
            return text.charAt(idx);
        }
    }
    extensions.register(new MyExtension(runtime));
}(Scratch));
