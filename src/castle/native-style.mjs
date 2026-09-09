export default `
.scene-heading{padding:30px 28px 22px;background:linear-gradient(115deg,#253d37,#182e33);border-bottom:1px solid #536357}
.scene-heading h1{margin:8px 0 12px}.scene-heading p{max-width:62ch;margin:0;color:#cbd1bc}
.castle-painting{display:block;width:100%;height:100%;object-fit:contain;opacity:1}
.castle-plan{position:relative;width:100%;height:100%}.castle-map-caption{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.castle-paper{background:linear-gradient(145deg,#52654b,#213a40)}
.map-scroll{max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-color:#a7986c #203739}
.map-stage{position:relative;width:100%;min-width:560px;aspect-ratio:1200/760}
.map-help{margin:0;padding:12px 20px}.scene-controls{position:static;padding:14px 20px;align-items:center;border-block:1px solid #536357;background:#203739}
.scene-controls a{min-height:44px;display:flex;align-items:center}
.secret-route{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.pin{border:2px solid #d9bd88;box-shadow:0 3px 14px #061b24aa}.pin.completed{border-style:double;border-width:4px}
.room-stage{position:relative;aspect-ratio:1000/660;width:100%}
.hotspot{position:absolute;transform:translate(-50%,-50%);width:44px;min-height:44px;padding:0;border-radius:50%;border:2px solid #e4c894;background:#193333ed;color:#f9dfac;box-shadow:0 2px 14px #10242477;font-size:26px;line-height:1}
.hotspot:hover,.hotspot:focus-visible{background:#e4c894;color:#18332f;z-index:1}.hotspot.observation{border-style:dashed}
.method{border-top:1px solid #536357;padding-top:16px;font:italic 19px/1.6 Georgia,serif;color:#e0c89c}
.thread-guide{margin-bottom:30px;padding:22px;border-left:3px solid #d3b477;background:#29453e}.thread-guide p{margin:8px 0 14px;max-width:68ch}
.castle-objects{padding:20px 28px;border-top:1px solid #667265;display:flex;gap:14px;align-items:center;flex-wrap:wrap}.castle-objects p{margin:0}.castle-objects small{display:block}
.nearby{padding:22px 28px;border-top:1px solid #536357;background:#213936}.nearby h2{width:100%;font-size:24px;margin-bottom:8px}.nearby button{margin:0 6px 6px 0}
.theory-board{margin-top:32px;border-top:1px solid #667265;padding-top:26px}.theory-board h3{overflow-wrap:anywhere}.theory-citation{display:flex;gap:10px;align-items:center;min-height:44px}.theory-citation input{width:22px;height:22px}.curator-drawer{margin-top:24px}fieldset{margin-top:18px;border:1px solid #667265;border-radius:6px}
#castle-film{display:block;width:100%;max-height:58dvh;background:#112629;border-radius:8px}
.museum-scene{position:relative;margin:26px 0;border:1px solid #536357;border-radius:9px;overflow:hidden;height:250px}.museum-scene .castle-painting{object-fit:cover;object-position:center 55%}.museum-scene figcaption{position:absolute;inset:auto 0 0;background:#142f30e8;padding:12px 18px;font-size:13px;color:#e0c89c}
.practice-panel{margin:22px 28px}.practice-panel h2{font-size:24px}.card .practice-panel{margin:20px 0 0;padding:16px;background:#1b3333}.practice-detail{padding:16px;border-left:3px solid #d3b477;background:#29453e;margin:18px 0 0}.practice-panel> .stack{grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))}
:host([data-contrast=true]) .hotspot,:host([data-contrast=true]) .pin{background:#061820;color:#fff;border-color:#ffdc92}
@media(max-width:480px){.scene-heading{padding:22px 18px}.scene-heading h1{font-size:34px}.scene-controls{padding:12px;gap:6px}.scene-controls button{padding:8px 10px}.castle-objects,.nearby{padding:18px}.map-help{padding:12px 18px}}
`;
