export class ModelsHelper {
  static async getModelField(model: string): Promise<any> {
    console.log(`getModelField activated ${model}.`);
    const url = `http://localhost:3101/api/tables/${model}?`;
    const response = await fetch(url + new URLSearchParams({
      psize: "0", // 0 will return all items - canceling paging
      pnum: "1",
      sortBy: JSON.stringify([{ sort: "sortNum" }]),
      searchBy: JSON.stringify([{
        id: "isEditable",
        type: 'text',
        operator: '=',
        value: true
      }, {
        id: "isActive",
        type: 'text',
        operator: '=',
        value: true
      }]),
    }));

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CRUD API error: ${errorText}`);
    }
    return await response.json();
  }
}