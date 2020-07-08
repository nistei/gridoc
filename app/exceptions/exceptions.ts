export class NotFoundException {
    public name = "NotFoundException";
    public status = 404;
    
    constructor(public message: string = "Not Found") {
    }

}
