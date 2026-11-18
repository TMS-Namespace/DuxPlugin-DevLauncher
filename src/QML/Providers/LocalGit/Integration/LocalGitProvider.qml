// LocalGitProvider.qml - The only QML entry point the plugin uses for the local Git folder source; it supplies the reader component.
import QtQml
import "../../../Contracts"
import ".."

ProviderBase {
    readerType: Component { LocalGitRecents {} }
}
