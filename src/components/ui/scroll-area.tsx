import * as React from "react";
import { cn } from "@/lib/utils";

export function ScrollArea({ className, children, ...props }: React.ComponentProps<"div">) {
	return (
		<div className={cn("overflow-x-auto overflow-y-hidden", className)} {...props}>
			{children}
		</div>
	);
}


