import * as React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FileInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onFilesChange: (files: File[]) => void;
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className: _className, onFilesChange, onChange, id, ...props }, ref) => {
    const { t } = useTranslation();
    const [fileCount, setFileCount] = React.useState(0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      setFileCount(files.length);
      onFilesChange(files);
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="flex items-center gap-1.5">
        <Label
          htmlFor={id || "file-input"}
          className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 cursor-pointer"
        >
          {t('createOrder.chooseFiles')}
        </Label>
        <Input
          {...props}
          id={id || "file-input"}
          type="file"
          className="sr-only"
          ref={ref}
          onChange={handleFileChange}
        />
        <span className="text-sm text-muted-foreground">
          {fileCount > 0
            ? t('createOrder.filesSelected', { count: fileCount })
            : t('createOrder.noFileChosen')}
        </span>
      </div>
    );
  }
);

FileInput.displayName = "FileInput";

export { FileInput };