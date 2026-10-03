import { useRef } from 'react';
import type { AssemblyState } from '../contracts';
import type { Language } from './i18n';

const copy = {
  zh: {
    button: '操作说明', close: '关闭说明', title: '如何操作组装工作台',
    intro: '先选中零件 → 调整位置和方向 → 检查并安装。点击安装位标签只会选择零件；“定位安装位”只会调整镜头。',
    axis: '红色 X：左右；绿色 Y：上下；蓝色 Z：前后。机头 FRONT 朝向 −Z，左侧为 −X，右侧为 +X；方向以飞机为准，镜头转动后不一定对应屏幕左右。',
    sections: [
      { title: '1. 移动零件：自由拖动与精确移动', steps: [
        '先点击零件库里的器件，或点击场景中的实体零件。选中未安装件并进入移动模式后，会出现彩色箭头；找不到器件时，点击“定位安装位”，同时查看零件和目标位置。',
        '点击画面上方“移动”。把鼠标放在实体零件表面，按住左键，拖向目标，再松开左键。按下位置要在零件上；在空白处拖动会转动镜头。',
        '自由拖动沿当前镜头的屏幕平面移动，不会自动保持高度，也不会自动吸附或安装。需要升降时，拖绿色 Y 箭头；需要只改一个方向时，拖对应的红 X、绿 Y 或蓝 Z 箭头。',
        '精确移动：按住彩色箭头的轴杆或箭头尖端并拖动，只沿该轴移动。按住两轴之间的小方块拖动，则在对应的两轴平面内移动。不要把安装位轮廓当作实体零件拖动。',
        '边拖边看场景中的虚线、距离和角度。松开鼠标后，安装位指南会更新位置与方向误差。先减小位置距离，再检查朝向；绿色“已对齐，可以检查并安装”表示检查条件已满足。',
        '示例：将动力组件拖到左前电机座附近；用绿色 Y 箭头调整高度，再用红 X、蓝 Z 箭头调整左右和前后。不要只凭某一个视角看起来重合，换俯视和侧视确认。',
      ], note: '拖错了可点“撤销”，恢复上一项装配操作；一次完整拖动只记一次操作。鼠标松开才提交移动。' },
      { title: '2. 旋转零件：调整安装朝向', steps: [
        '选中尚未安装的零件，点击“旋转”。彩色箭头变为旋转环；按住旋转环并沿圆周拖动，松开后提交朝向。',
        '红 X、绿 Y、蓝 Z 环分别绕对应轴旋转。例如绕绿色 Y 环转动，可改变零件水平朝向；在旋转模式直接拖零件实体不会平移它。',
        '安装位指南的“位置”和“方向”分别检查。位置已合格但方向不合格时，保持位置不动，调整旋转环，直到角度误差进入提示的容差。',
      ], note: '需要准确数值时，展开“高级调整：位置与旋转”，修改 X/Y/Z 位置或以度为单位的旋转角，再点击“应用位置与旋转”。只改输入框还不会生效。' },
      { title: '3. 控制镜头：环绕、缩放与平移', steps: [
        '在场景空白处按住鼠标左键拖动：绕工作台环绕观察。不要按在实体器件、彩色轴控件或安装位标签上。',
        '滚动鼠标滚轮：拉近或拉远。空白处按住鼠标右键拖动：平移镜头。触控板可用双指滚动缩放，右键拖动按系统的右键手势操作。',
        '用视角菜单切换“透视 / 俯视 / 正视 / 侧视”。用“定位安装位”重新把当前器件和目标放入视野；这些镜头操作不会改变器件的位置。',
      ], note: '区分对象：拖实体器件是移动器件；拖彩色箭头或旋转环是约束调整；拖空白处是操作镜头；点安装位标签是选择器件。' },
      { title: '4. 对齐、前置零件与确认安装', steps: [
        '阅读安装位指南，按机头 FRONT 和飞机左右找到对应位置。若提示缺少前置零件，先安装列出的器件；点击前置零件按钮可选择并定位它。',
        '手动调整后观察距离和角度是否都在容差内。也可点击“对齐安装位置”使用教学辅助，一次将器件移到目标位置与朝向。该按钮不会安装器件，也不会跳过前置检查。',
        '点击“检查并安装”才确认安装。检查通过后器件吸附并锁定，进度增加；检查未通过时，查看“安装反馈”中的位置、朝向或前置提示再调整。',
        '安装完成后点击“下一零件”，继续当前步骤。默认只显示当前步骤和选中件的安装位；勾选“全部安装位”可查看其余位点。',
      ], note: '不确定操作时，可先用主机架练习：选择主机架 → 移动与旋转 → 对齐安装位置 → 检查并安装。' },
      { title: '5. 为什么拖不动？拆卸、爆炸图与恢复', steps: [
        '已安装器件被锁定。先选中它并点“拆卸”，再移动；如果其他已安装器件依赖它，先按反馈提示拆掉这些器件。拆卸后器件留在原位置。',
        '爆炸图只供观察，移动、旋转与安装被锁定。再次点击“爆炸图”退出后继续组装。“隔离零件”和“隐藏保护架”只改变可见性。',
        '拖不到器件时，确认当前是“移动”模式、器件不是已安装状态，并尝试“定位安装位”。若误选了重叠零件，直接从零件库按编号选择。',
        '“撤销”恢复上一次装配操作；“重置”将全部器件回到初始散件位置，重置也可以撤销。进度自动保存在当前浏览器、当前地址，刷新会恢复。',
      ], note: '视角、选择和显示设置不占撤销记录。位置单位与模型安装关系为教学假设，不用于真实无人机装配。' },
    ],
    unselected: '先从零件库或实体模型选择器件，再点“移动”或“旋转”。',
    move: '移动器件：左键按住实体拖动；拖红 X / 绿 Y / 蓝 Z 箭头可只改一个方向。空白处左键拖动是转镜头。',
    rotate: '旋转器件：左键按住彩色旋转环，沿圆周拖动后松开。需要移动时，先切回“移动”。',
    installed: '当前器件已安装并锁定；点“拆卸”后才能移动。镜头仍可环绕、缩放和平移。',
    exploded: '爆炸图只供观察；再次点击“爆炸图”退出后，才能移动、旋转或安装器件。',
  },
  en: {
    button: 'How to operate', close: 'Close guide', title: 'How to use the assembly workbench',
    intro: 'Select a part → adjust position and orientation → check and install. Target labels only select parts; Locate mounting point only moves the camera.',
    axis: 'Red X: left/right; green Y: up/down; blue Z: front/back. FRONT points toward −Z; aircraft left is −X and right is +X. After orbiting, these may differ from screen left/right.',
    sections: [
      { title: '1. Move a part: free dragging and precise translation', steps: [
        'Select a library item or a solid part in the scene. Colored arrows appear for a loose part in Move mode. If you cannot find it, use Locate mounting point to frame the part and target together.',
        'Choose Move above the scene. Hold the left mouse button on the solid part, drag toward its target, then release. Start on the part itself: dragging empty space orbits the camera.',
        'Free dragging moves in the current camera’s screen plane. It does not preserve height or automatically snap or install. Drag the green Y arrow to change height; use red X, green Y or blue Z to constrain one direction.',
        'For precision, drag an arrow shaft or tip to move only along that axis. Drag the small square between two axes to move in their plane. Target outlines are guides, not draggable solid parts.',
        'Watch the dashed path, distance and angle while dragging. Release to update the inspector’s committed position and orientation. Reduce distance, then correct orientation; the green aligned status means the checks are satisfied.',
        'Example: drag a motor near the front-left seat. Use green Y for height and red X / blue Z for lateral and fore-aft position. Check Top and Side views: overlap in one view can hide a height error.',
      ], note: 'Undo restores the previous assembly action. One complete drag creates one action; movement is committed on release.' },
      { title: '2. Rotate a part: match its orientation', steps: [
        'Select a loose part and choose Rotate. Drag a rotation ring along its circumference, then release to commit.',
        'Red X, green Y and blue Z rings rotate around their respective axes. Green Y changes horizontal heading. Dragging a solid body in Rotate mode does not translate it.',
        'Position and orientation are checked separately. If position passes but orientation fails, keep the position and adjust a ring until the angle is within the displayed tolerance.',
      ], note: 'For exact values, expand Advanced: position & rotation, edit X/Y/Z position or rotation in degrees, then press Apply transform. Editing fields alone does not apply changes.' },
      { title: '3. Camera: orbit, zoom and pan', steps: [
        'Hold the left button on empty scene space and drag to orbit. Avoid parts, transform handles and mounting labels.',
        'Scroll to zoom. Hold the right button on empty space and drag to pan. A trackpad can use two-finger scrolling for zoom and your system’s right-click gesture for right dragging.',
        'Choose Perspective, Top, Front or Side in the camera menu. Locate mounting point reframes the selected part and target. Camera controls never move parts.',
      ], note: 'Drag a solid part to move it; drag a colored arrow or ring for constrained adjustment; drag empty space to control the camera; click a target label to select its part.' },
      { title: '4. Align, satisfy prerequisites and confirm installation', steps: [
        'Read the mounting guide and use FRONT and aircraft LEFT/RIGHT to find the seat. Install listed prerequisites first; clicking a prerequisite selects and locates it.',
        'Keep both distance and angle within tolerance. Align to target is optional teaching assistance that sets the target position and orientation in one action; it neither installs nor bypasses prerequisites.',
        'Press Check & install to confirm. A valid part snaps and locks, increasing progress. If rejected, read Installation feedback and correct position, orientation or prerequisites.',
        'Choose Next part to continue. The default shows current-step targets and the selected target; All mounting points reveals the remaining sites.',
      ], note: 'Try the main frame first: select → move and rotate → Align to target → Check & install.' },
      { title: '5. Cannot move it? Locks, disassembly and recovery', steps: [
        'Installed parts are locked. Select and Disassemble before moving. If installed dependents block removal, remove those parts first. A detached part stays in place.',
        'Exploded view is inspection-only: editing and installation are locked. Click Exploded view again to return. Isolate part and Hide guards affect visibility only.',
        'Check that Move is active and the part is loose, then try Locate mounting point. For overlapping parts, select the correct ID in the library.',
        'Undo restores the previous assembly action. Reset returns every part to its starting position and can also be undone. Progress saves in this browser at this address and restores after refresh.',
      ], note: 'Selection, camera and display settings do not consume undo history. Dimensions and mounting relationships are teaching assumptions, not real aircraft assembly instructions.' },
    ],
    unselected: 'Select a part in the library or scene, then choose Move or Rotate.',
    move: 'Move: left-drag a solid part; drag red X / green Y / blue Z arrows to constrain one direction. Left-drag empty space to orbit the camera.',
    rotate: 'Rotate: left-drag a colored ring along its circumference, then release. Switch back to Move to translate.',
    installed: 'This part is installed and locked. Disassemble before moving. Camera orbit, zoom and pan remain available.',
    exploded: 'Exploded view is inspection-only. Click it again to return before moving, rotating or installing.',
  },
};

export function OperationHelp({ language }: { language: Language }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const c = copy[language];
  return <>
    <button type="button" className="button compact operation-help-trigger" onClick={() => dialog.current?.showModal()}>? {c.button}</button>
    <dialog ref={dialog} className="operation-help-dialog" aria-labelledby="operation-help-title">
      <header><div><span>{language === 'zh' ? '鼠标操作 · 安装流程' : 'MOUSE CONTROLS · ASSEMBLY'}</span><h2 id="operation-help-title">{c.title}</h2></div><button type="button" className="button subtle" autoFocus onClick={() => dialog.current?.close()}>{c.close} ×</button></header>
      <div className="operation-help-body"><p className="operation-help-intro">{c.intro}</p><p className="operation-axis-key">{c.axis}</p>
        {c.sections.map((section, i) => <details key={section.title} open={i === 0}><summary>{section.title}</summary><ol>{section.steps.map(step => <li key={step}>{step}</li>)}</ol><p className="operation-help-note">{section.note}</p></details>)}
        <p className="operation-help-dismiss">{language === 'zh' ? '可按 Esc 关闭，返回刚才的工作台。' : 'Press Esc to close and return to your workbench.'}</p>
      </div>
    </dialog>
  </>;
}

export function OperationHint({ language, state }: { language: Language; state: AssemblyState }) {
  const c = copy[language];
  const part = state.selectedPartId ? state.parts[state.selectedPartId] : undefined;
  const text = state.exploded ? c.exploded : !part ? c.unselected : part.installed ? c.installed : state.interactionMode === 'rotate' ? c.rotate : c.move;
  return <p className="operation-hint" aria-live="polite"><span aria-hidden="true">⌁</span>{text}</p>;
}
