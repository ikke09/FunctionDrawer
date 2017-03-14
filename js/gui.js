// Represents the Gui elements for dat.gui
// This provides also the default values
function GUI() {
    this.ZFunc = "sin(x+y)";
    this.XMin = -10;
    this.XMax = 10;
    this.YMin = -10;
    this.YMax = 10;
    this.Subdivisions = 40;
    this.TangentialPlaneEnabled = false;
    this.X0 = 0.0;
    this.Y0 = 0.0;
    this.PartialX = "cos(x+y)";
    this.PartialY = "cos(x+y)";
    this.ResetCamera = function () {};
    this.CreateGraph = function () {};
}