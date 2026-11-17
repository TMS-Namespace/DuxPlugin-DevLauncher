// VSCodeProvider.qml - The only QML entry point the plugin uses for VS Code; it supplies the VS Code reader component.
import QtQml
import "../../../Contracts"
import ".."

ProviderBase {
    readerType: Component { VSCodeRecents {} }
}
