//事实证明,脑子是个好东西
/**感谢:
 * Mcrosoft(巨硬)提供的翻译
 * 百度百科提供的"权威"资料
 * GandiIDE提供的石山代码
 * Hook
 */
//DeepProbeV4:完善对runtime的探测功能
//DeepProbeV5计划:验证扩展可以拿到自己和其他扩展的实例
//now:DeepProbeV4:Latest
(function (_Scratch) {
    const { ArgumentType, BlockType, TargetType, Cast, translate, extensions, runtime } = _Scratch;
    const L = (...a) => console.log(...a);//有点好玩
    translate.setup({
        zh: { 'DeepProbe.Name': '深度探测V4','DeepProbe.printRuntime':'打印runtime清单','DeepProbe.canTheCompilerBeEnabled':'是否可以启用编译器模式?'},
        en: { 'DeepProbe.Name': 'DeepProbeV4','DeepProbe.printRuntime':'Print Runtime List','DeepProbe.canTheCompilerBeEnabled':'Can the compiler be enabled?'}
    });
    function DeepProbe_printRuntime(rt){
        //ccwAPI
        if (rt.ccwAPI) {
            const own = Object.getOwnPropertyNames(rt.ccwAPI);
            L('[ccwAPI自有成员]',own.length,own.join(', '));
            //逐个看:是函数就标
            own.forEach(k => {
                let v;
                try { v = rt.ccwAPI[k]; } catch (e) { v = `<读取抛错:${e.message}>`; }//打卡第一次
                L(`ccwAPI.${k} =`, typeof v === 'function' ? '函数' : v);
            });
            //找到个getOpenVM,重头戏:能不能拿到整个VM
            if (typeof rt.ccwAPI.getOpenVM === 'function') {
                try {
                    const vm = rt.ccwAPI.getOpenVM();
                    L('[getOpenVM()]',vm?'成功拿到 VM!':'返回空(鉴权失败)');
                    if (vm) {
                        L('VM自有属性:', Object.keys(vm).join(', '));
                        L('VM.runtime === rt ?', vm.runtime === rt);
                        L('VM原型方法:', Object.getOwnPropertyNames(
                            Object.getPrototypeOf(vm)).join(', '));
                    }
                } catch (e) { L('[getOpenVM()抛错]', e.message); }//打卡第二次
            }
            //其它能直接读的元信息
            ['getProjectUUID', 'getProjectSb3Id', 'getDeviceType'].forEach(fn => {
                if (typeof rt.ccwAPI[fn] === 'function') {
                    try { L(`[${fn}()]`, rt.ccwAPI[fn]()); }
                    catch (e) { L(`[${fn}()抛错]`, e.message); }//打卡第三次
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
        //解决BEFORE_EXECUTE空payload
        //发现钩子不带数据,只能自己去线程栈顶取
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
                        '角色=', t.target && t.target.getName && t.target.getName());
                }
            });
            rt.__execHooked = true;
        }
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
    function DeepProbe_canTheCompilerBeEnabled(rt){//探测探测,千万不要把参数改了
        //测试用
        const backup = JSON.parse(JSON.stringify(rt.compilerOptions));//存
        L('[编译器]当前:', JSON.stringify(rt.compilerOptions));
        try {
            rt.setCompilerOptions({ enabled: true, warpTimer: true });
            L('[编译器]尝试开启后:', JSON.stringify(rt.compilerOptions));
            L('[编译器]若仍是false则需要CCW权限或被上层锁定');
            rt.setCompilerOptions(backup);
        } catch (e) { L('[编译器] 开启抛错:', e.message); }//打卡第四次
        const _result=JSON.stringify(rt.compilerOptions);
        return _result;
    }
    //挂在全局方便控制台直接调
    window.DeepProbe_printRuntime=DeepProbe_printRuntime;
    window.DeepProbe_canTheCompilerBeEnabled=DeepProbe_canTheCompilerBeEnabled;
    class DeepProbe {
        constructor(_runtime) {
            this._runtime = _runtime;
            //这里不再自动调用DeepProbe
        }
        getInfo() {
            return {
                id: 'DeepProbe',
                color1: '#FF8C1A',
                color2: '#DB6E00',
                name: translate({ id: 'DeepProbe.Name' }),
                blocks:[{
                    opcode: 'printRuntimeList',
                    blockType: BlockType.COMMAND,
                    text : translate({ id: 'DeepProbe.printRuntime' }),
                    arguments: {}
                },{
                    opcode:'canTheCompilerBeEnabled',
                    blockType:BlockType.REPORTER,
                    text:translate({id:'DeepProbe.canTheCompilerBeEnabled'}),
                    arguments:{}
                }]
            };
        }
        printRuntimeList() {
            DeepProbe_printRuntime(this._runtime);
        }
        canTheCompilerBeEnabled(){
            return DeepProbe_canTheCompilerBeEnabled(this._runtime);
        }
    }
    extensions.register(new DeepProbe(runtime));
}(Scratch));
