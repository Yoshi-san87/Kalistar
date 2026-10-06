'use strict';

// Use the visible pager just as a player would; never force-click hidden cards.
async function openEquipment(page,id){
  const tile=page.locator(`.weapons-page [data-weapon="${id}"]`);
  await tile.waitFor({state:'attached'});
  if(!await tile.isVisible()){
    const pagination=await tile.evaluate(node=>{
      const entry=node.closest('.weapon-entry'),style=getComputedStyle(node.closest('.weapons-page'));
      return {index:Number(entry.dataset.equipmentIndex),size:Number(style.getPropertyValue('--weapon-columns'))*Number(style.getPropertyValue('--weapon-rows'))};
    });
    if(!pagination.size)throw Error('Equipment grid has no page dimensions.');
    await page.locator('[data-weapon-page=collection]').selectOption(String(Math.floor(pagination.index/pagination.size)));
  }
  await tile.click();
  await page.waitForFunction(()=>document.querySelector('#weapons-dialog').open);
}

module.exports={openEquipment};
